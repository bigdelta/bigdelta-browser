import { Metrical } from './client';

declare global {
  interface Window {
    metricalClient: Metrical;
    addForm: () => void;
  }
}

window.metricalClient = new Metrical({ baseURL: 'http://localhost:8080', writeKey: 'test' });
window.addForm = () => {
  const form = document.createElement('form');
  form.id = 'some-form';

  const input = document.createElement('input');
  input.name = 'some-input';
  input.value = 'test';
  input.type = 'text';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.innerHTML = 'submit';

  form.appendChild(input);
  form.appendChild(submit);

  document.body.appendChild(form);
};
