import { Bigdelta } from './client';

declare global {
  interface Window {
    bigdeltaClient: Bigdelta;
    addForm: () => void;
  }
}

window.bigdeltaClient = new Bigdelta({
  baseURL: 'http://localhost:8080',
  sdkKey: 'testKey',
  defaultTrackingConfig: {
    pageViews: {
      enabled: true,
      singlePageAppTracking: 'any',
    },
    forms: {
      enabled: true,
    },
  },
});

window.addForm = () => {
  const form = document.createElement('form');
  form.id = 'some-form';

  const input = document.createElement('input');
  input.name = 'some-input';
  input.value = 'test';
  input.type = 'text';

  const passwordInput = document.createElement('input');
  passwordInput.name = 'some-password-input';
  passwordInput.value = 'password';
  passwordInput.type = 'password';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.innerHTML = 'submit';

  form.appendChild(input);
  form.appendChild(passwordInput);
  form.appendChild(submit);

  document.body.appendChild(form);
};
