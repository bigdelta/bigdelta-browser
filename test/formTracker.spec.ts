import { FormTracker } from '../src/utils/formTracker';

describe('FormTracker', () => {
  describe('form submit', () => {
    it('should call handler when non excluded form is submitted', async () => {
      const included = addForm('included-form');
      const excluded = addForm('excluded-form');

      const submittedForms: Map<string, any> = new Map();

      new FormTracker(['excluded-form'], ['another-input'], async (formId, formData) => {
        submittedForms.set(formId, formData);
      }).init();

      included.submit();
      excluded.submit();

      expect(submittedForms).toStrictEqual(new Map([['included-form', { 'some-input': 'some' }]]));
    });
  });
});

const addForm = (formId: string): HTMLFormElement => {
  const form = document.createElement('form');
  form.id = formId;

  const someInput = document.createElement('input');
  someInput.name = 'some-input';
  someInput.value = 'some';
  someInput.type = 'text';

  const anotherInput = document.createElement('input');
  anotherInput.name = 'another-input';
  anotherInput.value = 'another';
  anotherInput.type = 'text';

  const passwordInput = document.createElement('input');
  passwordInput.name = 'password-input';
  passwordInput.value = 'password';
  passwordInput.type = 'password';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.innerHTML = 'submit';

  form.appendChild(someInput);
  form.appendChild(anotherInput);
  form.appendChild(passwordInput);
  form.appendChild(submit);

  document.body.appendChild(form);

  while (!document.body.querySelector(`#${formId}`)) {}

  return form;
};
