import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, Plus, Download, Settings, ChevronRight,
  ChevronDown, Link, Unlink, Trash2, Clock, Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import KeyframeEditor from '@/components/KeyframeEditor';

interface Layer {
  id: string;
  name: string;
  frameId: string;
  type: string;
  visible: boolean;
  locked: boolean;
  children?: Layer[];
}

interface Frame {
  id: string;
  name: string;
  layers: Layer[];
}

interface KeyframeProperties {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface Keyframe {
  id: string;
  layerId: string;
  time: number;
  properties: KeyframeProperties;
}

interface AnimationGroup {
  id: string;
  layerNames: string[];
  keyframes: Keyframe[];
  easing: string;
}

interface PluginMessage {
    type: 'frames-loaded' | 'load-frames' | 'create-animation-group' | 'update-keyframe' | 'preview-animation';
    frames?: Frame[];
    previewTime?: number;
    animationGroup?: AnimationGroup;
    keyframe?: Keyframe;
}

const defaultKeyframeProperties: KeyframeProperties = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0
};

const BannerifyTimeline: React.FC = () => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);
  const [expandedFrames, setExpandedFrames] = useState<string[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [animationGroups, setAnimationGroups] = useState<AnimationGroup[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(5);
  const [timelineScale, setTimelineScale] = useState(100);
  const [editingKeyframe, setEditingKeyframe] = useState<{
    groupId: string;
    keyframeId: string;
    properties: KeyframeProperties;
    time: number;
  } | null>(null);

  useEffect(() => {
    window.onmessage = (event: MessageEvent<{ pluginMessage: PluginMessage }>) => {
      const msg = event.data.pluginMessage;
      if (msg.type === 'frames-loaded') {
        setFrames(msg.frames || []);
      }
    };
  
    parent.postMessage({ pluginMessage: { type: 'load-frames' } }, '*');
  }, []);

  useEffect(() => {
    let animationFrame: number;
    
    if (isPlaying) {
      const startTime = Date.now() - (currentTime * 1000);
      
      const animate = () => {
        const now = Date.now();
        const newTime = (now - startTime) / 1000;
        
        if (newTime >= duration) {
          setCurrentTime(0);
          setIsPlaying(false);
        } else {
          setCurrentTime(newTime);
          parent.postMessage({ 
            pluginMessage: { 
              type: 'preview-animation',
              previewTime: newTime 
            } 
          }, '*');
          animationFrame = requestAnimationFrame(animate);
        }
      };
      
      animationFrame = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, currentTime, duration]);

  const toggleFrameExpansion = (frameId: string) => {
    setExpandedFrames(prev => 
      prev.includes(frameId) 
        ? prev.filter(id => id !== frameId)
        : [...prev, frameId]
    );
  };

  const createAnimationGroup = (layerIds: string[]) => {
    const layerNames = layerIds.map(id => {
      const layer = frames.flatMap(f => f.layers).find(l => l.id === id);
      return layer?.name || '';
    });

    const newGroup: AnimationGroup = {
      id: Date.now().toString(),
      layerNames,
      keyframes: [],
      easing: 'EASE_IN_AND_OUT'
    };

    setAnimationGroups(prev => [...prev, newGroup]);
    
    parent.postMessage({
      pluginMessage: {
        type: 'create-animation-group',
        animationGroup: newGroup
      }
    }, '*');
  };

  const addKeyframe = (groupId: string, time: number) => {
    setAnimationGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const newKeyframe = {
          id: Date.now().toString(),
          layerId: selectedLayers[0],
          time,
          properties: {...defaultKeyframeProperties}
        };
        return {
          ...group,
          keyframes: [...group.keyframes, newKeyframe]
        };
      }
      return group;
    }));
  };

  const updateKeyframe = (groupId: string, keyframeId: string, properties: KeyframeProperties) => {
    setAnimationGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const updatedGroup = {
          ...group,
          keyframes: group.keyframes.map(keyframe => 
            keyframe.id === keyframeId 
              ? { ...keyframe, properties }
              : keyframe
          )
        };
        
        parent.postMessage({
          pluginMessage: {
            type: 'update-keyframe',
            animationGroup: updatedGroup,
            keyframe: updatedGroup.keyframes.find(k => k.id === keyframeId)
          }
        }, '*');
        
        return updatedGroup;
      }
      return group;
    }));
  };

  const renderTimelineRuler = () => {
    const marks = [];
    for (let i = 0; i <= duration; i++) {
      marks.push(
        <div 
          key={i}
          className="absolute h-3 border-l border-gray-300"
          style={{ left: `${i * timelineScale}px` }}
        >
          <div className="text-xs text-gray-500 mt-3">{i}s</div>
        </div>
      );
    }
    return marks;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => createAnimationGroup(selectedLayers)}
            disabled={selectedLayers.length === 0}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timelineScale.toString()} onValueChange={(v: string) => setTimelineScale(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Zoom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50%</SelectItem>
              <SelectItem value="100">100%</SelectItem>
              <SelectItem value="200">200%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layers Panel */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          {frames.map(frame => (
            <div key={frame.id} className="border-b">
              <div 
                className={`flex items-center p-2 cursor-pointer hover:bg-gray-50 ${
                  selectedFrames.includes(frame.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedFrames(prev => 
                  prev.includes(frame.id) 
                    ? prev.filter(id => id !== frame.id)
                    : [...prev, frame.id]
                )}
              >
                <button
                  className="p-1 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFrameExpansion(frame.id);
                  }}
                >
                  {expandedFrames.includes(frame.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <span className="text-sm font-medium">{frame.name}</span>
              </div>
              
              {expandedFrames.includes(frame.id) && frame.layers.map(layer => (
                <div
                  key={layer.id}
                  className={`flex items-center p-2 pl-8 cursor-pointer hover:bg-gray-50 ${
                    selectedLayers.includes(layer.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedLayers(prev => 
                    prev.includes(layer.id)
                      ? prev.filter(id => id !== layer.id)
                      : [...prev, layer.id]
                  )}
                >
                  <span className="text-sm">{layer.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Timeline Panel */}
        <div className="flex-1 overflow-x-auto">
          <div className="relative">
            {/* Timeline Ruler */}
            <div className="sticky top-0 h-8 bg-white border-b flex items-end">
              {renderTimelineRuler()}
            </div>

            {/* Animation Groups */}
            <div className="relative">
              {animationGroups.map(group => (
                <div key={group.id} className="border-b p-2">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium mr-2">
                      {group.layerNames.join(', ')}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setAnimationGroups(prev => 
                        prev.filter(g => g.id !== group.id)
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div 
                    className="relative h-8 bg-gray-100 rounded"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const time = clickX / timelineScale;
                        addKeyframe(group.id, time);
                    }}
                   >
                    {group.keyframes.map(keyframe => (
                      <div
                        key={keyframe.id}
                        className="absolute top-0 w-3 h-3 bg-blue-500 rounded-full cursor-pointer transform -translate-x-1/2"
                        style={{ left: `${keyframe.time * timelineScale}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingKeyframe({
                            groupId: group.id,
                            keyframeId: keyframe.id,
                            properties: keyframe.properties,
                            time: keyframe.time
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Scrubber */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">
            {currentTime.toFixed(1)}s
          </span>
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={([value]) => setCurrentTime(value)}
            className="flex-1"
          />
          <span className="text-sm font-medium">
            {duration.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Keyframe Editor Dialog */}
      {editingKeyframe && (
        <KeyframeEditor
          isOpen={true}
          onClose={() => setEditingKeyframe(null)}
          keyframeId={editingKeyframe.keyframeId}
          groupId={editingKeyframe.groupId}
          initialProperties={editingKeyframe.properties}
          time={editingKeyframe.time}
          onUpdate={updateKeyframe}
        />
      )}
    </div>
  );
};

export default BannerifyTimeline;