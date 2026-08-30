import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Api, apiErrorInterceptor } from './api.service';
import { SignInComponent, ShellComponent, routes, signedIn } from './app.component';
import {
  AccountsComponent,
  BillingComponent,
  CardsComponent,
  ConfirmDialogComponent,
  DataTableComponent,
  NewTransactionComponent,
  ReportsComponent,
  UsersComponent,
} from './pages.component';

const account = {
  id: '00000000001', active: 'Y' as const, currentBalance: 125, creditLimit: 500,
  cashCreditLimit: 100, zip: '02110', groupId: 'GROUP1', expirationDate: '2027-12-31', reissueDate: '2025-01-01',
  customers: [{ id: 'CUST1', firstName: 'Ada', lastName: 'Lovelace', phone1: '555-0100' }], cards: [],
};
const card = { number: '4111111111111111', accountId: account.id, embossedName: 'Ada Lovelace', expirationDate: '2027-12-31', active: 'Y' as const };
const user = { id: 'USER001', firstName: 'Ada', lastName: 'Lovelace', role: 'U' as const };
const page = <T>(items: T[], nextCursor?: string) => ({ data: { items, page: { limit: 20, nextCursor } } });

function configure(component: unknown, withRouter = false) {
  TestBed.configureTestingModule({
    imports: [component as never],
    providers: [
      provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting(),
      ...(withRouter ? [provideRouter(routes)] : []),
    ],
  });
}

describe('application navigation and rendered states', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('redirects an anonymous visitor to sign-in and allows an authenticated visitor', () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(withInterceptors([apiErrorInterceptor]))] });
    const api = TestBed.inject(Api);
    const anonymous = TestBed.runInInjectionContext(() => signedIn({} as never, {} as never));
    expect((anonymous as { toString(): string }).toString()).toBe('/sign-in');

    api.user.set(user);
    expect(TestBed.runInInjectionContext(() => signedIn({} as never, {} as never))).toBeTrue();
  });

  it('renders sign-in loading state while authentication is pending', () => {
    configure(SignInComponent, true);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(SignInComponent);
    fixture.componentInstance.form.setValue({ userId: 'USER0001', password: 'User123!' });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    const request = http.expectOne('/api/auth/sign-in');
    expect(request.request.withCredentials).toBeTrue();
    const submit = fixture.nativeElement.querySelector('button.primary') as HTMLButtonElement;
    expect(submit.disabled).toBeTrue();
    expect(submit.textContent).toContain('Signing in…');
    request.flush({ data: { user } });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/overview');
    http.verify();
  });

  it('renders role-specific navigation and signs out to the public route', () => {
    configure(ShellComponent, true);
    const api = TestBed.inject(Api);
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);
    api.user.set({ ...user, role: 'A' });
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect([...fixture.nativeElement.querySelectorAll('aside nav a')].map((link: HTMLAnchorElement) => link.textContent?.trim() ?? '')).toEqual(['Users']);
    spyOn(router, 'navigateByUrl');
    fixture.componentInstance.logout();
    http.expectOne('/api/auth/sign-out').flush({});
    expect(api.user()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/sign-in');
    http.verify();
  });

  it('renders an accessible empty table state', () => {
    configure(DataTableComponent);
    const fixture = TestBed.createComponent(DataTableComponent);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('kind', 'card');
    fixture.componentRef.setInput('caption', 'Cards');
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('td[role="status"]') as HTMLTableCellElement;
    expect(empty.textContent).toContain('No records match');
    expect(empty.colSpan).toBe(5);
  });
});

describe('account and card maintenance workflows', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    TestBed.resetTestingModule();
  });

  it('loads account ETags and saves only the supported account patch fields', () => {
    configure(AccountsComponent);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AccountsComponent);
    fixture.detectChanges();
    http.expectOne('/api/accounts/00000000001').flush({ data: account }, { headers: { ETag: '"account-v1"' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Account 00000000001');

    fixture.componentInstance.editing.set(true);
    fixture.detectChanges();
    fixture.componentInstance.edit.patchValue({ creditLimit: 700, cashCreditLimit: 150, zip: '02111', groupId: '', active: 'N' });
    fixture.componentInstance.save(account.id);
    const update = http.expectOne('/api/accounts/00000000001');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.headers.get('If-Match')).toBe('"account-v1"');
    expect(update.request.body).toEqual(jasmine.objectContaining({ creditLimit: 700, cashCreditLimit: 150, zip: '02111', active: 'N' }));
    expect(update.request.body.groupId).toBeUndefined();
    update.flush({ data: account }, { headers: { ETag: '"account-v2"' } });
    http.expectOne('/api/accounts/00000000001').flush({ data: account }, { headers: { ETag: '"account-v2"' } });
    fixture.detectChanges();
  });

  it('uses the customer ETag and rejects an empty customer patch before requesting', () => {
    configure(AccountsComponent);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AccountsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('/api/accounts/00000000001').flush({ data: account }, { headers: { ETag: '"account-v1"' } });
    fixture.detectChanges();

    component.editCustomer(account.customers[0]);
    http.expectOne('/api/accounts/00000000001/customers/CUST1').flush({ data: account.customers[0] }, { headers: { ETag: '"customer-v1"' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Update Ada Lovelace');
    component.customerForm.reset({ phone1: '', phone2: '', address1: '', state: '', zip: '' });
    component.saveCustomer(account.id);
    expect(component.error()).toContain('at least one customer field');
    http.expectNone('/api/accounts/00000000001/customers/CUST1');

    component.customerForm.patchValue({ phone1: '555-0199' });
    component.saveCustomer(account.id);
    const update = http.expectOne('/api/accounts/00000000001/customers/CUST1');
    expect(update.request.headers.get('If-Match')).toBe('"customer-v1"');
    expect(update.request.body).toEqual({ phone1: '555-0199' });
    update.flush({ data: { ...account.customers[0], phone1: '555-0199' } }, { headers: { ETag: '"customer-v2"' } });
    http.expectOne('/api/accounts/00000000001').flush({ data: account }, { headers: { ETag: '"account-v1"' } });
    fixture.detectChanges();
  });

  it('filters cards, exposes the empty state, and updates a selected card with its ETag', () => {
    configure(CardsComponent);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CardsComponent);
    const component = fixture.componentInstance;
    http.expectOne('/api/cards').flush(page([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('td[role="status"]')?.textContent).toContain('No records');

    component.filter.patchValue({ accountId: account.id });
    component.applyFilters();
    const filtered = http.expectOne(request => request.url === '/api/cards' && request.params.get('accountId') === account.id);
    filtered.flush(page([card]));
    component.open(card);
    http.expectOne('/api/cards/4111111111111111').flush({ data: card }, { headers: { ETag: '"card-v1"' } });
    component.cardName = 'Ada Byron';
    component.active = 'N';
    component.save();
    const update = http.expectOne('/api/cards/4111111111111111');
    expect(update.request.headers.get('If-Match')).toBe('"card-v1"');
    expect(update.request.body).toEqual({ embossedName: 'Ada Byron', expirationDate: card.expirationDate, active: 'N' });
    update.flush({ data: { ...card, embossedName: 'Ada Byron', active: 'N' } }, { headers: { ETag: '"card-v2"' } });
    http.expectOne(request => request.url === '/api/cards' && request.params.get('accountId') === account.id).flush(page([]));
  });
});

describe('transaction, billing, and report workflows', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    TestBed.resetTestingModule();
  });

  it('retries a failed transaction with the same idempotency key and navigates on success', () => {
    configure(NewTransactionComponent, true);
    http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    spyOn(crypto, 'randomUUID').and.returnValues(
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    );
    const component = TestBed.createComponent(NewTransactionComponent).componentInstance;
    http.expectOne('/api/lookup/transaction-types').flush({ data: [{ code: '01', description: 'Purchase' }] });
    http.expectOne(request => request.url === '/api/lookup/transaction-categories' && request.params.get('typeCode') === '01')
      .flush({ data: [{ code: '0001', description: 'Retail' }] });
    component.form.patchValue({ cardNumber: card.number, description: 'Books', merchantName: 'Bookshop', merchantCity: 'Boston' });

    component.submit();
    const failed = http.expectOne('/api/transactions');
    expect(failed.request.headers.get('Idempotency-Key')).toBe('00000000-0000-4000-8000-000000000001');
    failed.flush({ error: { message: 'Temporary issue' } }, { status: 503, statusText: 'Unavailable' });
    expect(component.error()).toBe('Temporary issue');
    expect(component.saving()).toBeFalse();

    component.submit();
    const retry = http.expectOne('/api/transactions');
    expect(retry.request.headers.get('Idempotency-Key')).toBe('00000000-0000-4000-8000-000000000001');
    retry.flush({ data: { id: 'T1' } });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/transactions');

    component.submit();
    const fresh = http.expectOne('/api/transactions');
    expect(fresh.request.headers.get('Idempotency-Key')).toBe('00000000-0000-4000-8000-000000000002');
    fresh.flush({ data: { id: 'T2' } });
  });

  it('renders a modal payment confirmation and sends both billing concurrency headers', () => {
    configure(BillingComponent);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BillingComponent);
    const component = fixture.componentInstance;
    http.expectOne('/api/billing/00000000001/preview').flush(
      { data: { accountId: account.id, amountDue: 125, payable: true } }, { headers: { ETag: '"bill-v1"' } },
    );
    fixture.detectChanges();
    component.confirm.set(true);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Confirm full-balance payment');

    component.pay();
    const payment = http.expectOne('/api/billing/00000000001/pay-full-balance');
    expect(payment.request.headers.get('If-Match')).toBe('"bill-v1"');
    expect(payment.request.headers.get('Idempotency-Key')).toBeTruthy();
    payment.flush({ data: { transaction: { id: 'PAY1' }, account } }, { headers: { ETag: '"bill-v2"' } });
    http.expectOne('/api/billing/00000000001/preview').flush({ data: { accountId: account.id, amountDue: 0, payable: false } }, { headers: { ETag: '"bill-v2"' } });
    expect(component.success()).toContain('PAY1');
  });

  it('enforces report date ordering, sends non-custom periods without dates, and shows report errors', () => {
    configure(ReportsComponent);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ReportsComponent);
    const component = fixture.componentInstance;
    component.form.patchValue({ period: 'custom', startDate: '2022-07-01', endDate: '2022-06-01' });
    component.create();
    expect(component.form.errors?.['dateOrder']).toBeTrue();
    http.expectNone('/api/reports');

    component.form.patchValue({ period: 'monthly', startDate: '2022-06-01', endDate: '2022-06-30' });
    component.create();
    const create = http.expectOne('/api/reports');
    expect(create.request.body).toEqual({ period: 'monthly' });
    create.flush({ data: { id: 'R1', status: 'failed', period: 'monthly', startDate: '2022-06-01', endDate: '2022-06-30' } });
    http.expectOne('/api/reports/R1').flush({ error: { message: 'Report service unavailable' } }, { status: 503, statusText: 'Unavailable' });
    expect(component.error()).toBe('Report service unavailable');
  });
});

describe('administration and dialog accessibility', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    http = undefined as unknown as HttpTestingController;
    TestBed.resetTestingModule();
  });

  it('does not submit an invalid administrator user and creates a valid user', () => {
    configure(UsersComponent);
    http = TestBed.inject(HttpTestingController);
    const component = TestBed.createComponent(UsersComponent).componentInstance;
    http.expectOne('/api/admin/users').flush(page([]));
    component.newUser();
    component.form.patchValue({ id: 'A!', firstName: '', lastName: '', password: 'short' });
    component.save();
    expect(component.form.invalid).toBeTrue();
    http.expectNone('/api/admin/users');

    component.form.patchValue({ id: 'ADMIN02', firstName: 'Grace', lastName: 'Hopper', role: 'A', password: 'LongPass1' });
    component.save();
    const create = http.expectOne('/api/admin/users');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ id: 'ADMIN02', firstName: 'Grace', lastName: 'Hopper', role: 'A', password: 'LongPass1' });
    create.flush({ data: { id: 'ADMIN02' } });
    http.expectOne('/api/admin/users').flush(page([user]));
  });

  it('focuses the dialog heading, traps tab focus, and restores focus on escape', fakeAsync(() => {
    configure(ConfirmDialogComponent);
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const fixture: ComponentFixture<ConfirmDialogComponent> = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('title', 'Delete user?');
    fixture.componentRef.setInput('message', 'This cannot be undone.');
    fixture.detectChanges();
    expect(document.activeElement?.textContent).toContain('Delete user?');

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[1].focus();
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);
    fixture.nativeElement.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flushMicrotasks();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  }));
});
