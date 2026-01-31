export class PHIEncryption {
  private static async getKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-in-production');

    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('hipaa-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  public static async encrypt(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const key = await this.getKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encoder.encode(data)
      );

      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      return btoa(String.fromCharCode.apply(null, Array.from(combined)));
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  public static async decrypt(encryptedData: string): Promise<string> {
    try {
      const decoder = new TextDecoder();
      const key = await this.getKey();

      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );

      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  public static maskSSN(ssn: string): string {
    if (!ssn || ssn.length < 4) return '***';
    return `***-**-${ssn.slice(-4)}`;
  }

  public static maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return '***-***-****';
    return `***-***-${phone.slice(-4)}`;
  }

  public static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.com';
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2
      ? `${username[0]}***${username[username.length - 1]}`
      : '***';
    return `${maskedUsername}@${domain}`;
  }

  public static maskAddress(address: string): string {
    if (!address) return '*** *** St, City, ST';
    const parts = address.split(',');
    if (parts.length < 2) return '*** *** St, City, ST';
    return `*** ${parts[0].split(' ').pop()}, ${parts.slice(1).join(',')}`;
  }

  public static maskName(name: string): string {
    if (!name) return '***';
    const parts = name.split(' ');
    if (parts.length === 1) return `${name[0]}***`;
    return `${parts[0][0]}*** ${parts[parts.length - 1][0]}***`;
  }

  public static maskDOB(dob: string): string {
    if (!dob) return '**/**/****';
    const date = new Date(dob);
    return `**/**/${date.getFullYear()}`;
  }
}

export function shouldMaskPHI(userRole: string, context: 'view' | 'edit' | 'export'): boolean {
  const allowedRoles = ['admin', 'dispatcher', 'clinic_admin'];

  if (context === 'export') {
    return !['admin'].includes(userRole);
  }

  if (context === 'edit') {
    return !allowedRoles.includes(userRole);
  }

  return false;
}
