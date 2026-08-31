#!/usr/bin/env python3
"""Verify migration task-1 frozen legacy evidence without Node tooling."""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / 'test/fixtures/legacy/manifest.json'
LOOKUP_SOURCE = ROOT / '00.phase-1-input/cpy/CSLKPCDY.cpy'
LOOKUP_OUTPUT = ROOT / 'src/common/validation/legacy-validation-lookups.ts'
LOOKUP_GENERATOR = ROOT / 'scripts/generate-legacy-validation-lookups.py'
SYNTHETIC = ROOT / 'test/fixtures/synthetic/multi-card-payment.json'

# Fixed-width fields transcribed from the cited copybooks. A signed zoned-display
# PIC consumes its digits only; its sign is carried by the final digit's zone.
COPYBOOK_WIDTHS = {
    'CVCUS01Y.cpy': (500, [9, 25, 25, 25, 50, 50, 50, 2, 3, 10, 15, 15, 9, 20, 10, 10, 1, 3, 168]),
    'CVACT01Y.cpy': (300, [11, 1, 12, 12, 12, 10, 10, 10, 12, 12, 10, 10, 178]),
    'CVACT02Y.cpy': (150, [16, 11, 3, 50, 10, 1, 59]),
    'CVACT03Y.cpy': (50, [16, 9, 11, 14]),
    'CVTRA01Y.cpy': (50, [11, 2, 4, 11, 22]),
    'CVTRA02Y.cpy': (50, [10, 2, 4, 6, 28]),
    'CVTRA03Y.cpy': (60, [2, 50, 8]),
    'CVTRA04Y.cpy': (60, [2, 4, 50, 4]),
    'CVTRA05Y.cpy': (350, [16, 2, 4, 10, 100, 11, 9, 50, 50, 10, 16, 26, 26, 20]),
    'CSUSR01Y.cpy': (80, [8, 20, 20, 8, 1, 23]),
}


def fail(message: str) -> None:
    print(f'FAIL: {message}', file=sys.stderr)
    raise SystemExit(1)


def decode_fields(raw: bytes, widths: list[int]) -> list[str]:
    text = raw.decode('cp037')
    fields, position = [], 0
    for width in widths:
        fields.append(text[position:position + width])
        position += width
    return fields


def check_manifest() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    if manifest['canonicalEncoding'] != 'EBCDIC CP037':
        fail('manifest canonical encoding is not EBCDIC CP037')
    for fixture in manifest['fixtures']:
        path = ROOT / fixture['path']
        body = path.read_bytes()
        actual_hash = hashlib.sha256(body).hexdigest()
        if actual_hash != fixture['sha256']:
            fail(f'{fixture["path"]}: SHA-256 differs')
        if fixture['encoding'] == 'ASCII':
            records = body.splitlines()
            if any(len(record) != fixture['recordWidth'] for record in records):
                fail(f'{fixture["path"]}: ASCII record width differs')
        else:
            if len(body) % fixture['recordWidth']:
                fail(f'{fixture["path"]}: length is not divisible by record width')
            records = [body[index:index + fixture['recordWidth']] for index in range(0, len(body), fixture['recordWidth'])]
        if len(records) != fixture['recordCount']:
            fail(f'{fixture["path"]}: record count differs')


def check_copybook_widths() -> None:
    copybook_dir = ROOT / '00.phase-1-input/cpy'
    for name, (expected, fields) in COPYBOOK_WIDTHS.items():
        if sum(fields) != expected:
            fail(f'{name}: documented field widths sum to {sum(fields)}, expected {expected}')
        source = (copybook_dir / name).read_text(encoding='utf-8')
        source_widths = []
        for pic in re.findall(r'PIC\s+([^ .]+)', source, flags=re.IGNORECASE):
            matches = re.findall(r'[X9]\((\d+)\)', pic, flags=re.IGNORECASE)
            residual = re.sub(r'[X9]\(\d+\)', '', pic, flags=re.IGNORECASE)
            width = sum(int(match) for match in matches) + len(
                re.findall(r'[X9]', residual, flags=re.IGNORECASE),
            )
            if width:
                source_widths.append(width)
        if sum(source_widths) < expected:
            fail(f'{name}: source PIC widths total {sum(source_widths)}, expected at least {expected}')


def check_duplicate_and_divergences() -> None:
    data = ROOT / '00.phase-1-input/data'
    accounts_a = (data / 'EBCDIC/AWS.M2.CARDDEMO.ACCDATA.PS').read_bytes()
    accounts_b = (data / 'EBCDIC/AWS.M2.CARDDEMO.ACCTDATA.PS').read_bytes()
    if hashlib.sha256(accounts_a).digest() != hashlib.sha256(accounts_b).digest():
        fail('ACCDATA.PS and ACCTDATA.PS are no longer byte-identical')
    if (data / 'ASCII/USRSEC.txt').exists():
        fail('an ASCII user file unexpectedly exists')

    account = accounts_b[48 * 300:49 * 300]
    fields = decode_fields(account, COPYBOOK_WIDTHS['CVACT01Y.cpy'][1])
    if fields[0] != '00000000049' or fields[10] != 'ZEROAPR   ' or fields[11] != '          ':
        fail('canonical account 00000000049 ZIP/group anomaly differs')
    ascii_account = (data / 'ASCII/acctdata.txt').read_bytes().splitlines()[48].decode('ascii')
    if ascii_account[102:112] != 'A000000000':
        fail('ASCII account 00000000049 mirror ZIP divergence differs')

    disclosure = (data / 'EBCDIC/AWS.M2.CARDDEMO.DISCGRP.PS').read_bytes()[33 * 50:34 * 50]
    fields = decode_fields(disclosure, COPYBOOK_WIDTHS['CVTRA02Y.cpy'][1])
    if fields[:4] != ['DEFAULT   ', '07', '0001', '00150{']:
        fail('canonical DEFAULT/07/0001 interest divergence differs')
    ascii_disclosure = (data / 'ASCII/discgrp.txt').read_bytes().splitlines()[33].decode('ascii')
    if ascii_disclosure[:22] != 'DEFAULT   07000100000{':
        fail('ASCII DEFAULT/07/0001 interest divergence differs')

    xref = (data / 'ASCII/cardxref.txt').read_bytes().splitlines()
    if any(len(record) != 36 for record in xref):
        fail('ASCII cardxref mirror must omit exactly 14 filler bytes')


def check_generated_lookups() -> None:
    before = LOOKUP_OUTPUT.read_bytes()
    result = subprocess.run([sys.executable, str(LOOKUP_GENERATOR)], cwd=ROOT, check=False)
    after = LOOKUP_OUTPUT.read_bytes()
    if result.returncode or before != after:
        LOOKUP_OUTPUT.write_bytes(before)
        fail('generated CSLKPCDY lookups are stale or generator failed')
    source_hash = hashlib.sha256(LOOKUP_SOURCE.read_bytes()).hexdigest()
    if source_hash not in after.decode('utf-8'):
        fail('generated CSLKPCDY lookup source hash differs')


def check_synthetic_fixture() -> None:
    fixture = json.loads(SYNTHETIC.read_text(encoding='utf-8'))
    cards = [entry['cardNumber'] for entry in fixture['cardXrefs']]
    expected = fixture['expectedPayment']['selectedCardNumber']
    if len(cards) < 2 or cards == sorted(cards) or min(cards) != expected:
        fail('synthetic multi-card fixture does not prove lowest-card selection')
    if '00.phase-1-input' in str(SYNTHETIC.relative_to(ROOT)):
        fail('synthetic fixture is not isolated from immutable inputs')


def main() -> None:
    check_manifest()
    check_copybook_widths()
    check_duplicate_and_divergences()
    check_generated_lookups()
    check_synthetic_fixture()
    print('Legacy contract fixtures, widths, divergences, and generated lookups verified.')


if __name__ == '__main__':
    main()
