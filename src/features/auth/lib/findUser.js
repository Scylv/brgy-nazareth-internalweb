export function findUser(username, password, users) {
  const normalizedUsername = String(username).trim().toLowerCase();

  return users.find(
    (user) => user.username === normalizedUsername && user.password === password
  );
}
