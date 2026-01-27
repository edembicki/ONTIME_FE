import { useEffect, useState } from 'react';
import { api } from '../api/api';

export type Project = {
  id: string;
  label: string;
};

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.get('/projects').then(({ data }) => {
      setProjects(Array.isArray(data) ? data : []);
    });
  }, []);

  return { projects };
}
