const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
const { verifierJWT, requireRole } = require('../src/middleware/auth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('middleware verifierJWT', () => {
  test('rejette une requête sans header Authorization', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifierJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejette un token invalide', () => {
    const req = { headers: { authorization: 'Bearer token_invalide' } };
    const res = mockRes();
    const next = jest.fn();

    verifierJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepte un token valide et attache req.utilisateur', () => {
    const token = jwt.sign({ id: 'abc', role: 'CLIENT' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    verifierJWT(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.utilisateur.role).toBe('CLIENT');
  });
});

describe('middleware requireRole', () => {
  test('refuse un rôle non autorisé', () => {
    const req = { utilisateur: { role: 'CLIENT' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('ADMIN', 'RESPONSABLE_RESTO')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('autorise un rôle valide', () => {
    const req = { utilisateur: { role: 'ADMIN' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('ADMIN', 'RESPONSABLE_RESTO')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
