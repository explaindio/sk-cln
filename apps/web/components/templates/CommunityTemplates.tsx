import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Dialog, DialogContent, DialogTrigger } from '../ui/Dialog';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  previewImage: string;
  layout: string;
  contentPresets: string[];
}

const sampleTemplates: Template[] = [
  {
    id: 'edu-1',
    name: 'Online Course Hub',
    category: 'Education',
    description: 'Perfect for educators offering courses and workshops.',
    previewImage: '/templates/edu-course-hub.png',
    layout: 'grid',
    contentPresets: ['courses', 'quizzes', 'certificates']
  },
  {
    id: 'edu-2',
    name: 'Study Group',
    category: 'Education',
    description: 'Ideal for student communities and study sessions.',
    previewImage: '/templates/edu-study-group.png',
    layout: 'list',
    contentPresets: ['events', 'discussions', 'resources']
  },
  {
    id: 'bus-1',
    name: 'Professional Network',
    category: 'Business',
    description: 'Build connections and share industry insights.',
    previewImage: '/templates/bus-network.png',
    layout: 'network',
    contentPresets: ['posts', 'events', 'leaderboards']
  },
  {
    id: 'bus-2',
    name: 'Startup Community',
    category: 'Business',
    description: 'Support for entrepreneurs and innovators.',
    previewImage: '/templates/bus-startup.png',
    layout: 'dashboard',
    contentPresets: ['challenges', 'achievements', 'pitches']
  },
  {
    id: 'hob-1',
    name: 'Fitness Club',
    category: 'Hobby',
    description: 'Track workouts and motivate members.',
    previewImage: '/templates/hob-fitness.png',
    layout: 'timeline',
    contentPresets: ['events', 'progress', 'challenges']
  },
  {
    id: 'hob-2',
    name: 'Book Club',
    category: 'Hobby',
    description: 'Discuss books and share recommendations.',
    previewImage: '/templates/hob-bookclub.png',
    layout: 'feed',
    contentPresets: ['posts', 'polls', 'events']
  }
];

const categories = ['All', 'Education', 'Business', 'Hobby'];

const CommunityTemplates: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [customLayout, setCustomLayout] = useState<string[]>([]);

  const filteredTemplates = activeCategory === 'All'
    ? sampleTemplates
    : sampleTemplates.filter(template => template.category === activeCategory);

  const [showCustomization, setShowCustomization] = useState(false);
  const [customLayout, setCustomLayout] = useState<string[]>([]);

  const TemplateCard: React.FC<{ template: Template }> = ({ template }) => {
    const handlePreview = () => {
      setSelectedTemplate(template);
      setCustomLayout(['posts', 'events', 'courses']); // Default layout order
      setShowCustomization(true);
    };

    const DraggableSection: React.FC<{ id: string; name: string; enabled: boolean; onToggle: () => void }> = ({ id, name, enabled, onToggle }) => (
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/plain', id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const draggedId = e.dataTransfer.getData('text/plain');
          setCustomLayout(prev => {
            const draggedIndex = prev.indexOf(draggedId);
            const dropIndex = prev.indexOf(id);
            if (draggedIndex > -1 && dropIndex > -1 && draggedIndex !== dropIndex) {
              const newLayout = [...prev];
              newLayout.splice(draggedIndex, 1);
              newLayout.splice(dropIndex, 0, draggedId);
              return newLayout;
            }
            return prev;
          });
        }}
        className={`p-4 border rounded-lg cursor-move mb-2 transition-colors ${
          enabled ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-300'
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">{name}</span>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>
    );

    const CustomizationInterface: React.FC = () => {
      if (!selectedTemplate) return null;

      const sections = ['posts', 'events', 'courses', 'leaderboard', 'announcements'];
      const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>(() => {
        const presetsMap: Record<string, boolean> = {};
        selectedTemplate.contentPresets.forEach(preset => presetsMap[preset] = true);
        return { ...Object.fromEntries(sections.map(s => [s, false])), ...presetsMap };
      });
      const [theme, setTheme] = useState({ primaryColor: '#3B82F6', fontFamily: 'Inter' });
      const [layoutStyle, setLayoutStyle] = useState<'grid' | 'list'>(selectedTemplate.layout as 'grid' | 'list');

      const toggleSection = (section: string) => {
        setEnabledSections(prev => ({ ...prev, [section]: !prev[section] }));
      };

      const updateTheme = (key: keyof typeof theme, value: string) => {
        setTheme(prev => ({ ...prev, [key]: value }));
      };

      const visibleSections = customLayout.filter(section => enabledSections[section]);

      const sampleContent = {
        posts: 'Sample posts with reactions and comments...',
        events: 'Upcoming events and registrations...',
        courses: 'Course modules and progress tracking...',
        leaderboard: 'Top members with points and badges...',
        announcements: 'Important community updates...'
      };

      return (
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Customize Layout & Content</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-3">Sections & Presets</h4>
              {sections.map(section => (
                <DraggableSection
                  key={section}
                  id={section}
                  name={section.charAt(0).toUpperCase() + section.slice(1)}
                  enabled={enabledSections[section]}
                  onToggle={() => toggleSection(section)}
                />
              ))}
              <h5 className="font-medium mt-4 mb-2">Content Presets</h5>
              <div className="space-y-2 text-xs">
                {selectedTemplate.contentPresets.map(preset => (
                  <label key={preset} className="flex items-center">
                    <Switch
                      checked={enabledSections[preset as keyof typeof enabledSections] || false}
                      onCheckedChange={() => toggleSection(preset)}
                      className="mr-2"
                    />
                    {preset}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Themes</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Primary Color</label>
                  <div className="flex gap-1">
                    {['#3B82F6', '#EF4444', '#10B981', '#F59E0B'].map(color => (
                      <button
                        key={color}
                        onClick={() => updateTheme('primaryColor', color)}
                        style={{ backgroundColor: color }}
                        className={`w-8 h-8 rounded-full border-2 transition ${
                          theme.primaryColor === color ? 'border-black' : 'border-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">Font Family</label>
                  <select
                    value={theme.fontFamily}
                    onChange={(e) => updateTheme('fontFamily', e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Inter">Inter (Modern)</option>
                    <option value="serif">Serif (Classic)</option>
                    <option value="monospace">Monospace (Tech)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Layout Style</label>
                  <div className="flex gap-2">
                    {['grid', 'list'].map(style => (
                      <button
                        key={style}
                        onClick={() => setLayoutStyle(style as 'grid' | 'list')}
                        className={`px-3 py-1 rounded text-sm ${
                          layoutStyle === style ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Live Preview</h4>
              <div
                className={`border rounded-lg p-4 h-96 overflow-y-auto space-y-4`}
                style={{
                  fontFamily: theme.fontFamily,
                  '--primary-color': theme.primaryColor
                } as React.CSSProperties}
              >
                {visibleSections.length === 0 ? (
                  <p className="text-gray-500 text-center" style={{ color: theme.primaryColor }}>Add sections to see the layout</p>
                ) : (
                  visibleSections.map((section) => {
                    const content = sampleContent[section as keyof typeof sampleContent] || 'Sample content...';
                    const className = layoutStyle === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2';
                    return (
                      <div key={section} className={`p-3 border rounded ${className}`}>
                        <h5 className="font-medium" style={{ color: theme.primaryColor }}>
                          {section.charAt(0).toUpperCase() + section.slice(1)} Section
                        </h5>
                        <p className="text-sm text-gray-600">{content}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button onClick={() => setShowCustomization(false)}>Save & Apply</Button>
            <Button variant="outline" onClick={() => setShowCustomization(false)}>Cancel</Button>
          </div>
        </div>
      );
    };

    return (
      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200">
        <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
          <img
            src={template.previewImage}
            alt={template.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
            {template.category}
          </div>
        </div>
        <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{template.description}</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {template.contentPresets.map(preset => (
            <span key={preset} className="text-xs bg-gray-100 px-2 py-1 rounded">
              {preset}
            </span>
          ))}
        </div>
        <Dialog open={showCustomization} onOpenChange={setShowCustomization}>
          <DialogTrigger asChild onClick={handlePreview}>
            <Button variant="outline" className="w-full">Preview & Customize</Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{selectedTemplate?.name || template.name} Preview & Customization</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Static Preview</h3>
                <p>Preview content for {selectedTemplate?.name || template.name} would go here. This simulates the community layout with {selectedTemplate?.layout || template.layout} structure and presets: {selectedTemplate?.contentPresets.join(', ') || template.contentPresets.join(', ')}.</p>
                <div className="mt-4 h-64 bg-white border rounded-lg flex items-center justify-center">
                  Template Static Preview
                </div>
              </div>
              <CustomizationInterface />
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Use Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Community Templates</h1>
        <p className="text-gray-600">Choose from pre-designed templates to quickly launch your community.</p>
      </div>
      
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map(category => (
            <TabsTrigger key={category} value={category} className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeCategory} className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No templates found in this category.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Enhanced Sharing and Marketplace Placeholder */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Template Sharing & Marketplace</h3>
          <p className="text-gray-600 mb-4">Share your custom templates with the community or browse user-created templates in the marketplace.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Share Template</Button>
            <Button variant="outline" size="sm">Browse Marketplace</Button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Analytics & Tracking</h3>
          <p className="text-gray-600 mb-4">Monitor template usage, popular sections, and engagement metrics across communities.</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-bold text-lg">1,234</div>
              <div>Total Uses</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-bold text-lg">89%</div>
              <div>Satisfaction</div>
            </div>
          </div>
          <Button variant="outline" className="mt-2 w-full">View Detailed Analytics</Button>
        </Card>
      </div>
    </div>
  );
};

export default CommunityTemplates;