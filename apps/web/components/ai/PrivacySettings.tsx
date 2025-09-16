'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { 
  Shield, 
  Eye, 
  Database, 
  Download, 
  Trash2, 
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Lock,
  Unlock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { behavioralAnalytics } from '@/services/behavioralAnalytics';
import { UserPreferences } from './AIContentRecommendations';

interface PrivacySettingsProps {
  userId?: string;
  onPreferencesChange?: (preferences: UserPreferences) => void;
  className?: string;
}

interface PrivacyLevel {
  key: 'minimal' | 'balanced' | 'full';
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  limitations: string[];
}

const privacyLevels: PrivacyLevel[] = [
  {
    key: 'minimal',
    label: 'Minimal Data Collection',
    description: 'Only essential data for basic recommendations',
    icon: Lock,
    features: [
      'Basic content recommendations',
      'Privacy-first approach',
      'Minimal data storage',
      'No behavioral tracking',
    ],
    limitations: [
      'Limited personalization',
      'No learning from behavior',
      'Basic recommendation quality',
    ],
  },
  {
    key: 'balanced',
    label: 'Balanced Approach',
    description: 'Good personalization with reasonable privacy',
    icon: Shield,
    features: [
      'Personalized recommendations',
      'Behavioral learning',
      'Privacy-conscious tracking',
      'User preference learning',
      'Content similarity analysis',
    ],
    limitations: [
      'Some data collection required',
      'Limited real-time updates',
    ],
  },
  {
    key: 'full',
    label: 'Full Personalization',
    description: 'Maximum personalization with comprehensive tracking',
    icon: Unlock,
    features: [
      'Advanced AI recommendations',
      'Real-time behavioral learning',
      'Cross-content similarity',
      'Predictive analytics',
      'A/B testing participation',
      'Advanced engagement tracking',
    ],
    limitations: [
      'Comprehensive data collection',
      'Requires more storage',
      'Higher computational usage',
    ],
  },
];

export function PrivacySettings({ userId = 'currentUser', onPreferencesChange, className }: PrivacySettingsProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    enableAIRecommendations: true,
    preferredCategories: ['programming', 'webdev'],
    blockedCategories: [],
    contentTypes: ['post', 'course', 'event', 'video'],
    privacyLevel: 'balanced',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [showDataDeletion, setShowDataDeletion] = useState(false);
  const [exportData, setExportData] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  useEffect(() => {
    // Load saved preferences
    const loadPreferences = () => {
      try {
        const saved = localStorage.getItem(`user_preferences_${userId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setPreferences(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, [userId]);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    // Save to localStorage
    try {
      localStorage.setItem(`user_preferences_${userId}`, JSON.stringify(newPreferences));
      setLastSaved(new Date());
      
      // Update behavioral analytics tracking
      if (newPreferences.enableAIRecommendations) {
        behavioralAnalytics.enableTracking();
      } else {
        behavioralAnalytics.disableTracking();
      }
      
      // Notify parent component
      if (onPreferencesChange) {
        onPreferencesChange(newPreferences);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handlePrivacyLevelChange = (level: UserPreferences['privacyLevel']) => {
    updatePreferences({ privacyLevel: level });
  };

  const handleContentTypeToggle = (contentType: string) => {
    const currentTypes = preferences.contentTypes;
    const newTypes = currentTypes.includes(contentType as any)
      ? currentTypes.filter(type => type !== contentType)
      : [...currentTypes, contentType as any];
    
    updatePreferences({ contentTypes: newTypes });
  };

  const handleCategoryToggle = (category: string, isBlocked: boolean) => {
    const key = isBlocked ? 'blockedCategories' : 'preferredCategories';
    const current = preferences[key];
    const newList = current.includes(category)
      ? current.filter(cat => cat !== category)
      : [...current, category];
    
    updatePreferences({ [key]: newList });
  };

  const handleDataExport = async () => {
    setIsLoading(true);
    try {
      const data = behavioralAnalytics.exportUserData();
      setExportData(data);
      setShowDataExport(true);
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataDeletion = async () => {
    setIsLoading(true);
    try {
      behavioralAnalytics.clearUserData();
      localStorage.removeItem(`user_preferences_${userId}`);
      
      // Reset to default preferences
      const defaultPreferences: UserPreferences = {
        enableAIRecommendations: false,
        preferredCategories: [],
        blockedCategories: [],
        contentTypes: [],
        privacyLevel: 'minimal',
      };
      
      setPreferences(defaultPreferences);
      setShowDataDeletion(false);
      
      if (onPreferencesChange) {
        onPreferencesChange(defaultPreferences);
      }
    } catch (error) {
      console.error('Failed to delete data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExportData = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-recommendations-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentPrivacyLevel = privacyLevels.find(level => level.key === preferences.privacyLevel)!;

  return (
    <Card className={cn('max-w-4xl', className)}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary-600" />
          <CardTitle>AI Recommendations Privacy Settings</CardTitle>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Control how your data is used to personalize content recommendations
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Settings className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">AI Recommendations</h3>
              <p className="text-sm text-gray-600">
                Enable personalized content recommendations powered by AI
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.enableAIRecommendations}
            onCheckedChange={(checked) => updatePreferences({ enableAIRecommendations: checked })}
            disabled={isLoading}
          />
        </div>

        {/* Privacy Level Selection */}
        {preferences.enableAIRecommendations && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Privacy Level</h3>
              <div className="grid gap-3">
                {privacyLevels.map((level) => {
                  const Icon = level.icon;
                  const isSelected = preferences.privacyLevel === level.key;
                  
                  return (
                    <div
                      key={level.key}
                      className={cn(
                        'border rounded-lg p-4 cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      onClick={() => handlePrivacyLevelChange(level.key)}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={cn(
                          'h-5 w-5 mt-0.5',
                          isSelected ? 'text-primary-600' : 'text-gray-400'
                        )} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className={cn(
                              'text-sm font-medium',
                              isSelected ? 'text-primary-900' : 'text-gray-900'
                            )}>
                              {level.label}
                            </h4>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-primary-600" />
                            )}
                          </div>
                          <p className={cn(
                            'text-sm',
                            isSelected ? 'text-primary-700' : 'text-gray-600'
                          )}>
                            {level.description}
                          </p>
                          
                          <div className="grid md:grid-cols-2 gap-4 pt-2">
                            <div>
                              <h5 className={cn(
                                'text-xs font-medium mb-1',
                                isSelected ? 'text-primary-800' : 'text-gray-700'
                              )}>
                                Features:
                              </h5>
                              <ul className="space-y-1">
                                {level.features.map((feature, index) => (
                                  <li key={index} className={cn(
                                    'text-xs flex items-center space-x-1',
                                    isSelected ? 'text-primary-700' : 'text-gray-600'
                                  )}>
                                    <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className={cn(
                                'text-xs font-medium mb-1',
                                isSelected ? 'text-primary-800' : 'text-gray-700'
                              )}>
                                Limitations:
                              </h5>
                              <ul className="space-y-1">
                                {level.limitations.map((limitation, index) => (
                                  <li key={index} className={cn(
                                    'text-xs flex items-center space-x-1',
                                    isSelected ? 'text-primary-700' : 'text-gray-600'
                                  )}>
                                    <XCircle className="h-3 w-3 flex-shrink-0" />
                                    <span>{limitation}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content Type Preferences */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Content Types</h3>
              <div className="flex flex-wrap gap-2">
                {(['post', 'course', 'event', 'video'] as const).map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={preferences.contentTypes.includes(type)}
                      onChange={() => handleContentTypeToggle(type)}
                      className="rounded border-gray-300"
                      disabled={isLoading}
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Preferences */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Preferred Categories</h3>
                <div className="space-y-2">
                  {['programming', 'webdev', 'ai', 'design', 'business'].map(category => (
                    <label key={category} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={preferences.preferredCategories.includes(category)}
                        onChange={() => handleCategoryToggle(category, false)}
                        className="rounded border-gray-300"
                        disabled={isLoading}
                      />
                      <span className="text-sm capitalize">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Blocked Categories</h3>
                <div className="space-y-2">
                  {['marketing', 'sales', 'general'].map(category => (
                    <label key={category} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={preferences.blockedCategories.includes(category)}
                        onChange={() => handleCategoryToggle(category, true)}
                        className="rounded border-gray-300"
                        disabled={isLoading}
                      />
                      <span className="text-sm capitalize">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Management */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Data Management</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Eye className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Data Collection</p>
                  <p className="text-xs text-gray-600">
                    {preferences.enableAIRecommendations ? 'Active' : 'Disabled'}
                  </p>
                </div>
              </div>
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                preferences.enableAIRecommendations
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              )}>
                {preferences.enableAIRecommendations ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />Active</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" />Disabled</>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Data Storage</p>
                  <p className="text-xs text-gray-600">
                    Stored locally in your browser
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Info className="h-3 w-3 mr-1" />
                Local Only
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDataExport}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export My Data</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDataDeletion(true)}
              disabled={isLoading}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete My Data</span>
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="text-xs text-gray-500 text-right">
          Last saved: {lastSaved.toLocaleTimeString()}
        </div>
      </CardContent>

      {/* Data Export Modal */}
      {showDataExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Export Your Data</h3>
              <button
                onClick={() => setShowDataExport(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Your AI recommendation data includes:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• Behavioral analytics events</li>
                <li>• User preferences and settings</li>
                <li>• Content interaction history</li>
                <li>• Recommendation feedback</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {exportData}
              </pre>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDataExport(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={downloadExportData}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download JSON</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Deletion Confirmation */}
      {showDataDeletion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">Delete Your Data</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              This will permanently delete all your AI recommendation data, including:
            </p>
            
            <ul className="text-sm text-gray-600 space-y-1 mb-6">
              <li>• Behavioral analytics history</li>
              <li>• User preferences and settings</li>
              <li>• Content interaction data</li>
              <li>• Recommendation feedback</li>
            </ul>

            <p className="text-sm font-medium text-red-600 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDataDeletion(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDataDeletion}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete All Data</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}