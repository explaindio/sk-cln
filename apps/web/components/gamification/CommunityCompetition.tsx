
'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from 'lib/api';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import { Trophy } from 'lucide-react';

function useCompetitions() {
  return useQuery({
    queryKey: ['competitions'],
    queryFn: async () => (await api.get('/api/gamification/competitions')).data,
  });
}

export function CommunityCompetition() {
  const { data: competitions, isLoading } = useCompetitions();

  if (isLoading || !competitions || competitions.length === 0) {
    return null;
  }

  return (
    <div>
      {competitions.map((comp: any) => (
        <Card key={comp.id}>
          <CardHeader>
            <CardTitle>{comp.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Render standings here */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}