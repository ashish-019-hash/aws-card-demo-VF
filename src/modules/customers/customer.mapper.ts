import { trimFixed } from '../../common/validation/legacy-write.validators';
import { CustomerEntity } from './customer.entity';
export function toCustomerDetail(customer: CustomerEntity): Record<string, unknown> {
  return {
    id: trimFixed(customer.id),
    firstName: customer.firstName,
    middleName: customer.middleName,
    lastName: customer.lastName,
    addressLine1: customer.addressLine1,
    addressLine2: customer.addressLine2,
    addressLine3: customer.addressLine3,
    addressStateCode: trimFixed(customer.addressStateCode),
    addressCountryCode: trimFixed(customer.addressCountryCode),
    addressZip: trimFixed(customer.addressZip),
    phoneNumber1: customer.phoneNumber1,
    phoneNumber2: customer.phoneNumber2,
    ssn: customer.ssn,
    governmentIssuedId: customer.governmentIssuedId,
    dob: customer.dob,
    eftAccountId: customer.eftAccountId,
    primaryCardHolder: customer.primaryCardHolder,
    ficoScore: customer.ficoScore,
    version: customer.version,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}
