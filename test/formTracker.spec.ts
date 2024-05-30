import { FormTracker } from '../src/formTracker';

describe('FormTracker', () => {
  describe('form submit', () => {
    it('should call handler when existing form is submitted', async () => {
      const form = addForm();
      let submitted = false;
      new FormTracker('#some-form', (form, callback, event) => {
        submitted = true;
        callback();
      }).init();

      form.submit();

      expect(submitted).toBe(true);
    });
  });
});

const addForm = (): HTMLFormElement => {
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

  while (!document.body.querySelector('#some-form')) {}

  return form;
};
