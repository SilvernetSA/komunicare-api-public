import { Injectable } from '@nestjs/common';

interface MailTemplate {
  from: string;
  subject: string;
  html: string;
  text: string;
}

const FROM_ADDRESS = 'info@komuni.care';

const buildVerificationMail = (
  locale: string,
  domain: string,
  url: string
): MailTemplate => {
  const verificationURL = `${domain}/activate/${url}`;

  if (locale === 'es-ES') {
    return {
      from: FROM_ADDRESS,
      subject: 'Komunicare - Por favor confirme la cuenta',
      html: `¡Gracias por registrarte en Komunicare!<br>Haga clic en el siguiente enlace para confirmar su cuenta:</p><p>${verificationURL}</p><br>Thanks,<br>The Komunicare team`,
      text: `¡Gracias por registrarte en Komunicare!. Haga clic en el siguiente enlace para confirmar su cuenta: ${verificationURL}`
    };
  }

  return {
    from: FROM_ADDRESS,
    subject: 'Komunicare - Please confirm account',
    html: `Thanks for signup to Komunicare!<br>Click the following link to confirm your account:</p><p>${verificationURL}</p><br>Thanks,<br>The Komunicare team`,
    text: `Thanks for signup to Komunicare!. Please confirm your account by clicking the following link: ${verificationURL}`
  };
};

const buildConfirmMail = (): MailTemplate => {
  return {
    from: FROM_ADDRESS,
    subject: 'Komunicare - Successfully verified!',
    html: '<p>Your account at Komunicare has been successfully verified.</p>',
    text: 'Your account at Komunicare has been successfully verified.'
  };
};

const buildResetPasswordMail = (
  locale: string,
  domain: string,
  token: string,
  userId: string
): MailTemplate => {
  const resetPasswordURL = `${domain}/reset/${userId}/${token}`;

  if (locale === 'es-ES') {
    return {
      from: FROM_ADDRESS,
      subject: 'Komunicare - Restablecer contraseña',
      html: `<p>Se envió una solicitud para restablecer la contraseña de su cuenta Komunicare. </p> \
      <p>Esta solicitud caducará en 24 horas. Por favor establezca una nueva contraseña lo antes posible.</p> \
      <p>Por favor restablezca su cuenta haciendo clic en <a href = "${resetPasswordURL}">este enlace</a>. </p> \
      <p>Si no puede hacerlo, copie y pegue el siguiente enlace en su navegador:</p><p>${resetPasswordURL}</p>`,
      text: `Se envió una solicitud para restablecer la contraseña de su cuenta Komunicare. \
      Esta solicitud caducará en 24 horas. Por favor establezca una nueva contraseña lo antes posible. \
      Por favor restablezca su cuenta haciendo clic ${resetPasswordURL} \
      Si no puede hacerlo, copie y pegue el siguiente enlace en su navegador: ${resetPasswordURL}`
    };
  }

  return {
    from: FROM_ADDRESS,
    subject: 'Komunicare - Password reset',
    html: `<p>A request was submitted to reset the password of your Komunicare account. </p> \
    <p>This request will expire in 24 hours. Please set a new password as soon as possible.</p> \
    <p>Please reset your account by clicking <a href = "${resetPasswordURL}">this link</a>. </p> \
    <p>If you are unable to do so, copy and paste the following link into your browser:</p><p>${resetPasswordURL}</p>`,
    text: `A request was submitted to reset the password of your Komunicare account. \
    This request will expire in 24 hours. Please set a new password as soon as possible. \
    Please reset your account by clicking ${resetPasswordURL} \
    If you are unable to do so, copy and paste the following link into your browser: ${resetPasswordURL}`
  };
};

@Injectable()
export class MailTemplateService {
  getVerificationMail(local: string, domain: string, url: string): any {
    return buildVerificationMail(local, domain, url);
  }

  getConfirmMail(): any {
    return buildConfirmMail();
  }

  getResetPasswordMail(
    local: string,
    domain: string,
    token: string,
    userId: string
  ): any {
    return buildResetPasswordMail(local, domain, token, userId);
  }
}
