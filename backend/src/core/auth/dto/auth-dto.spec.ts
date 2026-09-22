import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDoctorDto } from '../../../modules/doctors/dto/create-doctor.dto';
import { PHONE_PATTERN } from '../../../common/validation';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';
import { ResetPasswordDto } from './reset-password.dto';

const errorsOf = async (cls: new () => object, plain: object) => {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { fields: errors.map((e) => e.property).sort(), instance: instance as any };
};

const valid = { firstName: 'Dara', lastName: 'Sok', email: 'dara@example.com', password: 'longenough1', role: 'user' };

describe('RegisterDto', () => {
  it('accepts a normal sign-up, with or without a phone', async () => {
    expect((await errorsOf(RegisterDto, valid)).fields).toEqual([]);
    expect((await errorsOf(RegisterDto, { ...valid, phone: '+855 12 345 678' })).fields).toEqual([]);
  });

  it('trims names, email and phone before validating/storing', async () => {
    const { fields, instance } = await errorsOf(RegisterDto, {
      ...valid, firstName: '  Dara ', lastName: ' Sok', email: ' dara@example.com ', phone: ' 012 345 678 ',
    });
    expect(fields).toEqual([]);
    expect([instance.firstName, instance.lastName, instance.email, instance.phone]).toEqual(['Dara', 'Sok', 'dara@example.com', '012 345 678']);
  });

  it('rejects empty or whitespace-only names (previously accepted)', async () => {
    expect((await errorsOf(RegisterDto, { ...valid, firstName: '' })).fields).toEqual(['firstName']);
    expect((await errorsOf(RegisterDto, { ...valid, lastName: '   ' })).fields).toEqual(['lastName']);
  });

  it('enforces length limits', async () => {
    expect((await errorsOf(RegisterDto, { ...valid, firstName: 'x'.repeat(51) })).fields).toEqual(['firstName']);
    expect((await errorsOf(RegisterDto, { ...valid, email: `${'a'.repeat(250)}@b.co` })).fields).toEqual(['email']);
    expect((await errorsOf(RegisterDto, { ...valid, password: 'short' })).fields).toEqual(['password']);
    expect((await errorsOf(RegisterDto, { ...valid, password: 'x'.repeat(73) })).fields).toEqual(['password']);
    expect((await errorsOf(RegisterDto, { ...valid, password: 'x'.repeat(72) })).fields).toEqual([]);
  });

  it('rejects malformed emails, unknown roles and unknown fields', async () => {
    expect((await errorsOf(RegisterDto, { ...valid, email: 'not-an-email' })).fields).toEqual(['email']);
    expect((await errorsOf(RegisterDto, { ...valid, role: 'admin' })).fields).toEqual(['role']);
    expect((await errorsOf(RegisterDto, { ...valid, user_type: 'user' })).fields).toEqual(['user_type']);
  });
});

describe('phone numbers', () => {
  it.each(['012 345 678', '+855 12 345 678', '(023) 123-456', '0123456', '+85512345678'])('accepts %s', (p) =>
    expect(PHONE_PATTERN.test(p)).toBe(true),
  );
  it.each(['', 'abc', '12345', '+', '012-', '1'.repeat(16), '012 345 678 x', '<script>', '--1234567--'])('rejects "%s"', (p) =>
    expect(PHONE_PATTERN.test(p)).toBe(false),
  );
  it('RegisterDto refuses a bad phone and an empty-string phone', async () => {
    expect((await errorsOf(RegisterDto, { ...valid, phone: 'abc' })).fields).toEqual(['phone']);
    expect((await errorsOf(RegisterDto, { ...valid, phone: '' })).fields).toEqual(['phone']);
  });
});

describe('LoginDto', () => {
  it('trims the email, needs a password, and bounds both', async () => {
    const ok = await errorsOf(LoginDto, { email: ' a@b.co ', password: 'x' });
    expect(ok.fields).toEqual([]);
    expect(ok.instance.email).toBe('a@b.co');
    expect((await errorsOf(LoginDto, { email: 'a@b.co', password: '' })).fields).toEqual(['password']);
    expect((await errorsOf(LoginDto, { email: 'a@b.co', password: 'x'.repeat(201) })).fields).toEqual(['password']);
    expect((await errorsOf(LoginDto, { email: 'nope', password: 'x' })).fields).toEqual(['email']);
  });

  it('does NOT impose the 8-character minimum on login (existing accounts may have shorter passwords)', async () => {
    expect((await errorsOf(LoginDto, { email: 'a@b.co', password: 'abc' })).fields).toEqual([]);
  });
});

describe('ResetPasswordDto / CreateDoctorDto share the password limits', () => {
  it('limits the new password to 8-72 characters', async () => {
    const reset = { email: 'a@b.co', token: 't', password: 'longenough1' };
    expect((await errorsOf(ResetPasswordDto, reset)).fields).toEqual([]);
    expect((await errorsOf(ResetPasswordDto, { ...reset, password: 'short' })).fields).toEqual(['password']);
    expect((await errorsOf(ResetPasswordDto, { ...reset, password: 'x'.repeat(73) })).fields).toEqual(['password']);
  });

  it('doctor accounts: names required and trimmed, password 8-72, empty phone still allowed', async () => {
    const doctor = { firstName: ' Sok ', lastName: 'Chan', email: 'd@b.co', password: 'longenough1', phone: '', hospitalId: 1 };
    const ok = await errorsOf(CreateDoctorDto, doctor);
    expect(ok.fields).toEqual([]);
    expect(ok.instance.firstName).toBe('Sok');
    expect((await errorsOf(CreateDoctorDto, { ...doctor, firstName: ' ' })).fields).toEqual(['firstName']);
    expect((await errorsOf(CreateDoctorDto, { ...doctor, password: 'x'.repeat(73) })).fields).toEqual(['password']);
  });
});
