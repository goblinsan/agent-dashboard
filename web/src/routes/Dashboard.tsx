import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

type Project = { id: string; name: string; goal?: string };
export default function Dashboard() {
  const { data } = useQuery({ queryKey: ['projects'], queryFn: () => api<Project[]>('/v1/projects') });
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Projects</h1>
      <ul className="space-y-2">
        {data?.map(p => (
          <li key={p.id} className="border rounded p-3">
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm opacity-75">{p.goal}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
