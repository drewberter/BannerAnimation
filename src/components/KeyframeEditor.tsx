import React, { useState, useEffect } from 'react';
import { X, Move, Maximize, RotateCw, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface KeyframeProperties {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const defaultProperties: KeyframeProperties = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0
};

interface KeyframeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  keyframeId: string;
  groupId: string;
  initialProperties?: Partial<KeyframeProperties>;
  onUpdate: (groupId: string, keyframeId: string, properties: KeyframeProperties) => void;
  time?: number;
}

const KeyframeEditor: React.FC<KeyframeEditorProps> = ({
  isOpen,
  onClose,
  keyframeId,
  groupId,
  initialProperties = {},
  onUpdate,
  time = 0
}) => {
  const [properties, setProperties] = useState<KeyframeProperties>({
    ...defaultProperties,
    ...initialProperties
  });

  useEffect(() => {
    setProperties({
      ...defaultProperties,
      ...initialProperties
    });
  }, [initialProperties]);

  const handlePropertyChange = (property: keyof KeyframeProperties, value: number) => {
    const updatedProperties = {
      ...properties,
      [property]: value
    };
    setProperties(updatedProperties);
    onUpdate(groupId, keyframeId, updatedProperties);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Keyframe at {time.toFixed(2)}s
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Opacity Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Opacity
              </Label>
              <Input
                type="number"
                value={properties.opacity}
                onChange={(e) => handlePropertyChange('opacity', Number(e.target.value))}
                className="w-20"
                min={0}
                max={1}
                step={0.1}
              />
            </div>
            <Slider
              value={[properties.opacity]}
              max={1}
              step={0.1}
              onValueChange={([value]) => handlePropertyChange('opacity', value)}
            />
          </div>

          {/* Position Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Move className="w-4 h-4" />
                X Position
              </Label>
              <Input
                type="number"
                value={properties.x}
                onChange={(e) => handlePropertyChange('x', Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Move className="w-4 h-4" />
                Y Position
              </Label>
              <Input
                type="number"
                value={properties.y}
                onChange={(e) => handlePropertyChange('y', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Scale Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Maximize className="w-4 h-4" />
                Scale
              </Label>
              <Input
                type="number"
                value={properties.scale}
                onChange={(e) => handlePropertyChange('scale', Number(e.target.value))}
                className="w-20"
                min={0}
                step={0.1}
              />
            </div>
            <Slider
              value={[properties.scale]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={([value]) => handlePropertyChange('scale', value)}
            />
          </div>

          {/* Rotation Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                Rotation
              </Label>
              <Input
                type="number"
                value={properties.rotation}
                onChange={(e) => handlePropertyChange('rotation', Number(e.target.value))}
                className="w-20"
                step={15}
              />
            </div>
            <Slider
              value={[properties.rotation]}
              min={-360}
              max={360}
              step={15}
              onValueChange={([value]) => handlePropertyChange('rotation', value)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyframeEditor;