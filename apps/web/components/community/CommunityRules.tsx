'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { ScrollText, Plus, X } from 'lucide-react';

interface Rule {
  id: string;
  order: number;
  title: string;
  description: string;
}

interface CommunityRulesProps {
  rules: Rule[];
  canEdit: boolean;
  onUpdate?: (rules: Rule[]) => void;
}

export function CommunityRules({ rules, canEdit, onUpdate }: CommunityRulesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRules, setEditedRules] = useState(rules);

  const handleAddRule = () => {
    const newRule: Rule = {
      id: Date.now().toString(),
      order: editedRules.length + 1,
      title: '',
      description: '',
    };
    setEditedRules([...editedRules, newRule]);
  };

  const handleRemoveRule = (id: string) => {
    setEditedRules(editedRules.filter((rule) => rule.id !== id));
  };

  const handleSave = () => {
    onUpdate?.(editedRules);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <ScrollText className="h-5 w-5 mr-2" />
            Community Rules
          </CardTitle>
          {canEdit && !isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            {editedRules.map((rule, index) => (
              <div key={rule.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={rule.title}
                      onChange={(e) => {
                        const updated = [...editedRules];
                        updated[index].title = e.target.value;
                        setEditedRules(updated);
                      }}
                      placeholder={`Rule ${index + 1} title`}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                    <textarea
                      value={rule.description}
                      onChange={(e) => {
                        const updated = [...editedRules];
                        updated[index].description = e.target.value;
                        setEditedRules(updated);
                      }}
                      placeholder="Rule description"
                      rows={2}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveRule(rule.id)}
                    className="ml-2 text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={handleAddRule}>
                <Plus className="h-4 w-4 mr-1" />
                Add Rule
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Rules
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditedRules(rules);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.length === 0 ? (
              <p className="text-gray-500 text-sm">No rules defined yet</p>
            ) : (
              rules.map((rule, index) => (
                <div key={rule.id}>
                  <h4 className="font-medium">
                    {index + 1}. {rule.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {rule.description}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}