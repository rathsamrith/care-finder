import { appointmentStatusMail, esc, resetPasswordMail } from './mail.templates';

describe('mail templates', () => {
  it('escapes HTML special characters', () => {
    expect(esc('<script>"x" & \'y\'</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
  });

  it('never injects user-controlled values as markup', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const mail = appointmentStatusMail(
      { patientName: evil, title: evil, hospitalName: evil, doctorName: evil, when: 'x', url: 'https://app.test/appointment' },
      'Confirmed',
    );
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;img');
    expect(mail.subject).toContain('Appointment confirmed');
  });

  it('puts the reset link in both html and text parts', () => {
    const url = 'https://app.test/reset-password?t=abc&e=a%40b.c';
    const mail = resetPasswordMail('Dara', url, 10);
    expect(mail.text).toContain(url);
    expect(mail.html).toContain('reset-password?t=abc&amp;e=a%40b.c');
  });
});
