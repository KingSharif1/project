export function maskPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ***-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ***-${cleaned.slice(7)}`;
  }
  return phone.slice(0, 3) + '***' + phone.slice(-2);
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
}

export function maskSSN(ssn: string): string {
  if (!ssn) return '';
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `***-**-${cleaned.slice(5)}`;
  }
  return '***-**-' + ssn.slice(-4);
}

export function maskAddress(address: string): string {
  if (!address) return '';
  const parts = address.split(',');
  if (parts.length > 1) {
    return `*** ${parts[0].split(' ').pop()}, ${parts.slice(1).join(',')}`;
  }
  return address;
}

export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber) return '';
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length >= 12) {
    return `****-****-****-${cleaned.slice(-4)}`;
  }
  return '****-****-****-' + cardNumber.slice(-4);
}

export function maskDateOfBirth(dob: string): string {
  if (!dob) return '';
  const date = new Date(dob);
  if (isNaN(date.getTime())) return dob;
  return `**/**/${date.getFullYear()}`;
}

export function shouldMaskData(userRole?: string): boolean {
  const sensitiveRoles = ['admin', 'manager', 'hipaa_officer'];
  return !userRole || !sensitiveRoles.includes(userRole.toLowerCase());
}

export function getMaskedValue(
  value: string,
  fieldType: 'phone' | 'email' | 'ssn' | 'address' | 'creditCard' | 'dob',
  userRole?: string
): string {
  if (!shouldMaskData(userRole)) {
    return value;
  }

  switch (fieldType) {
    case 'phone':
      return maskPhone(value);
    case 'email':
      return maskEmail(value);
    case 'ssn':
      return maskSSN(value);
    case 'address':
      return maskAddress(value);
    case 'creditCard':
      return maskCreditCard(value);
    case 'dob':
      return maskDateOfBirth(value);
    default:
      return value;
  }
}
