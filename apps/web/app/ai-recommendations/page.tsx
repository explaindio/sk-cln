'use client';

import { useState } from 'react';
import { AIContentRecommendations } from '@/components/ai/AIContentRecommendations';
import { PrivacySettings } from '@/components/ai/PrivacySettings';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  Brain, 
  Shield, 
  TrendingUp, 
  Settings,
  BarChart3,
  Download,
  RefreshCw,
  Eye,
  Heart,
  MessageSquare
} from 'lucide-react';

export default function AIRecommendationsPage() {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'privacy' | 'analytics'>('recommendations');
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  // Use the AI recommendations hook
  const {
    recommendations,
    isLoading,
    error,
    refresh,
    trackEngagement,
    updatePreferences,
    getBehavioralMetrics,
    clearUserData,
    exportUserData,
  } = useAIRecommendations({
    limit: 8,
    enableTracking: true,
    refreshInterval: 300000, // 5 minutes
    onRecommendationClick: (content) => {
      console.log('Recommendation clicked:', content);
    },
    onRecommendationEngagement: (content, action) => {
      console.log(`User ${action} recommendation:`, content);
    },
  });

  const behavioralMetrics = getBehavioralMetrics();

  const handlePrivacyChange = (preferences: any) => {
    updatePreferences(preferences);
  };

  const handleRefresh = () => {
    refresh();
  };

  const handleExportData = () => {
    const data = exportUserData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-recommendations-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <Brain className="h-8 w-8 text-primary-600" />
                <span>AI-Powered Content Recommendations</span>
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Discover personalized content tailored to your interests and behavior
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPrivacySettings(!showPrivacySettings)}
                className="flex items-center space-x-2"
              >
                <Shield className="h-4 w-4" />
                <span>Privacy Settings</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Privacy Settings Panel */}
        {showPrivacySettings && (
          <div className="mb-8">
            <PrivacySettings onPreferencesChange={handlePrivacyChange} />
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="recommendations" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Recommendations</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Privacy & Settings</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Recommendations */}
              <div className="lg:col-span-2">
                <AIContentRecommendations />
              </div>

              {/* Sidebar with Stats */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Your Activity</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Engagement Score</span>
                      <span className="text-sm font-medium">{behavioralMetrics.engagementScore}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${behavioralMetrics.engagementScore}%` }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {behavioralMetrics.activityPatterns.contentTypePreferences.post || 0}
                        </div>
                        <div className="text-xs text-gray-600">Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {behavioralMetrics.activityPatterns.contentTypePreferences.course || 0}
                        </div>
                        <div className="text-xs text-gray-600">Courses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {behavioralMetrics.activityPatterns.contentTypePreferences.video || 0}
                        </div>
                        <div className="text-xs text-gray-600">Videos</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Interests */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Your Interests</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(behavioralMetrics.interestVector)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([interest, score]) => (
                          <div key={interest} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 capitalize">{interest}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary-600 h-2 rounded-full"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 w-8">{score}%</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendation Accuracy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Heart className="h-5 w-5" />
                      <span>Recommendation Quality</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Click-through Rate</span>
                      <span className="text-sm font-medium">
                        {behavioralMetrics.recommendationAccuracy.clickThroughRate}%
                        {behavioralMetrics.recommendationAccuracy.clickThroughRate > 50 && (
                          <span className="text-green-600 ml-1">📈</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Like Rate</span>
                      <span className="text-sm font-medium">
                        {behavioralMetrics.recommendationAccuracy.likeRate}%
                        {behavioralMetrics.recommendationAccuracy.likeRate > 30 && (
                          <span className="text-green-600 ml-1">👍</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Time Spent</span>
                      <span className="text-sm font-medium">
                        {behavioralMetrics.recommendationAccuracy.timeSpentRate}%
                        vs general content
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <PrivacySettings onPreferencesChange={handlePrivacyChange} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Behavioral Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Behavioral Analytics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Engagement Score</h3>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Overall Activity</span>
                          <span className="text-sm font-medium">{behavioralMetrics.engagementScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${behavioralMetrics.engagementScore}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600">
                          {behavioralMetrics.engagementScore}
                        </div>
                        <div className="text-xs text-gray-600">Score</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Activity Patterns</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Most Active Hours</span>
                        <span className="text-sm font-medium">
                          {behavioralMetrics.activityPatterns.mostActiveHours.join(', ')}:00
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Content Types</span>
                        <span className="text-sm font-medium">
                          {Object.keys(behavioralMetrics.activityPatterns.contentTypePreferences).length} types
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Tag Preferences</span>
                        <span className="text-sm font-medium">
                          {Object.keys(behavioralMetrics.activityPatterns.tagPreferences).length} tags
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendation Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Recommendation Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Accuracy Metrics</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Click-through Rate</span>
                          <span className="text-sm font-medium">
                            {behavioralMetrics.recommendationAccuracy.clickThroughRate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${behavioralMetrics.recommendationAccuracy.clickThroughRate}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Like Rate</span>
                          <span className="text-sm font-medium">
                            {behavioralMetrics.recommendationAccuracy.likeRate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${behavioralMetrics.recommendationAccuracy.likeRate}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Time Spent vs General</span>
                          <span className="text-sm font-medium">
                            {behavioralMetrics.recommendationAccuracy.timeSpentRate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${behavioralMetrics.recommendationAccuracy.timeSpentRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interest Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Interest Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Top Interests</h3>
                    <div className="space-y-2">
                      {Object.entries(behavioralMetrics.interestVector)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 8)
                        .map(([interest, score]) => (
                          <div key={interest} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 capitalize">{interest}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary-600 h-2 rounded-full"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 w-8">{score}%</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Content Type Preferences</h3>
                    <div className="space-y-2">
                      {Object.entries(behavioralMetrics.activityPatterns.contentTypePreferences)
                        .sort(([,a], [,b]) => b - a)
                        .map(([type, score]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 capitalize">{type}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 w-8">{score}%</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Export Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Data Export & Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={handleExportData}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Analytics Data</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all behavioral data? This action cannot be undone.')) {
                        clearUserData();
                        refresh();
                      }
                    }}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Clear All Data</span>
                  </Button>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">About Your Data</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        All behavioral data is stored locally in your browser and is never shared with third parties. 
                        You have full control over your data and can export or delete it at any time.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}