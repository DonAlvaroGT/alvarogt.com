// No importa firebase-admin en pruebas locales. Se instala y configura solo con autorización.
export async function createFirebaseAdminAdapter() {
  let admin;
  try {
    ({ default: admin } = await import('firebase-admin'));
  } catch {
    throw new Error('Adaptador Firebase pendiente: instala firebase-admin y configura credenciales solo tras autorización.');
  }
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();
  return {
    authenticate: async (request) => {
      const header = request?.headers?.authorization || '';
      if (!header.startsWith('Bearer ')) throw new Error('Falta autenticación.');
      const token = await admin.auth().verifyIdToken(header.slice(7));
      return { uid: token.uid, token };
    },
    db,
  };
}
