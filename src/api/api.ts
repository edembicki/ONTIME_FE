import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://ontime-be.onrender.com/',
});
