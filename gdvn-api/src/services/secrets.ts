export const jwtSecretBytes = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
