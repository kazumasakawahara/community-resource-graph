/**
 * Register Form Component
 *
 * User registration form
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const RegisterForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('supporter');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register({
        name,
        email,
        password,
        role,
        organization: organization || undefined
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>ユーザー登録</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>
            名前
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="role" style={{ display: 'block', marginBottom: '5px' }}>
            役割
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          >
            <option value="supporter">支援者</option>
            <option value="family">家族</option>
            <option value="beneficiary">当事者</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="organization" style={{ display: 'block', marginBottom: '5px' }}>
            所属組織 (任意)
          </label>
          <input
            id="organization"
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          />
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '登録中...' : '登録'}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <a href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
          既にアカウントをお持ちの方はこちら
        </a>
      </div>
    </div>
  );
};
