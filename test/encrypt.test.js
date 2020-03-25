const {
  encrypt_str,
  decrypt_str,
  batch_encrypt_str,
  batch_decrypt_str,
} = require('../lib/encrypt');

test('test crypt 1', () => {
  const key = 'sfsfs';
  const text = 'ggg';
  const encrypted = encrypt_str(text, key);
  const decrypted = decrypt_str(encrypted.encrypted, key, encrypted.iv);
  expect(decrypted).toEqual(text);
});

test('test crypt 2', () => {
  const key = 'sklfj';
  const text = ['aaa', '啊a啊', `😊`];
  const batch_en_res = batch_encrypt_str(text, key);
  const batch_de_res = batch_decrypt_str(batch_en_res.encrypted, key, batch_en_res.iv);
  expect(text).toEqual(batch_de_res);
});
