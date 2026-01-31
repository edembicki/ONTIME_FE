import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://ontime-be.onrender.com/',
  //baseURL: 'http://localhost:3001/',
});
