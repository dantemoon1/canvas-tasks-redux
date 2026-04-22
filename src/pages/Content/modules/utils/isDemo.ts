import baseURL from './baseURL';

export default function isDemo(): boolean {
  return !!process.env.DEMO || baseURL().includes('localhost');
}
