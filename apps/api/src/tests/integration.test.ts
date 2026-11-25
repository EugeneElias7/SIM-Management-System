import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/password';

describe('API integration', () => {
  const app = createApp();
  const email = 'test-admin@sansolution.in';
  const password = 'TestPassword123';
  let userId: string;

  beforeAll(async () => {
    const role = await prisma.role.upsert({
      where: { name: 'Administrator' },
      update: {},
      create: { name: 'Administrator', description: 'Test admin', permissions: ['*'] },
    });
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        firstName: 'Test',
        lastName: 'Admin',
        roleId: role.id,
        isActive: true,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('reports health', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('up');
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' });
    expect(response.status).toBe(401);
  });

  it('logs in and returns the current user', async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({ email, password });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.email).toBe(email);

    const meResponse = await agent.get('/api/auth/me');
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.role).toBe('Administrator');
  });

  it('protects authenticated routes', async () => {
    const response = await request(app).get('/api/dashboard');
    expect(response.status).toBe(401);
  });
});
