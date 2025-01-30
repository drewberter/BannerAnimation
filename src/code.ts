figma.showUI(__html__, { width: 800, height: 600 });

type AnimationEasing = "EASE_IN" | "EASE_OUT" | "EASE_IN_AND_OUT" | "LINEAR";
type Direction = "LEFT" | "RIGHT" | "TOP" | "BOTTOM";

interface LayerData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  children?: LayerData[];
}

interface FrameData {
  id: string;
  name: string;
  layers: LayerData[];
}

interface KeyframeProperties {
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
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
  easing: AnimationEasing;
}

interface Message {
  type: string;
  frameIds?: string[];
  layerIds?: string[];
  animationGroup?: AnimationGroup;
  keyframe?: Keyframe;
  previewTime?: number;
}

function getLayerData(node: SceneNode): LayerData {
  // Type guard to check for properties
  const isVisibleNode = 'visible' in node;
  const isLockableNode = 'locked' in node;

  const baseData: LayerData = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: isVisibleNode ? (node as any).visible : true,
    locked: isLockableNode ? (node as any).locked : false
  };

  if ('children' in node) {
    baseData.children = ((node as ChildrenMixin).children as SceneNode[]).map(child => getLayerData(child));
  }

  return baseData;
}

// Helper function to find nodes by name across frames
function findNodesByName(name: string, frames: FrameNode[]): SceneNode[] {
  const nodes: SceneNode[] = [];
  frames.forEach(frame => {
    // Use type assertion here since we know the result will be SceneNodes
    const matches = frame.findAll(node => node.name === name) as SceneNode[];
    nodes.push(...matches);
  });
  return nodes;
}

async function applyKeyframeProperties(node: SceneNode, properties: KeyframeProperties) {
  // Type guards for different node types
  const hasOpacity = 'opacity' in node;
  const hasPosition = 'x' in node && 'y' in node;
  const hasRotation = 'rotation' in node;
  const hasScale = 'rescale' in node;
  if (hasOpacity && properties.opacity !== undefined) {
    (node as any).opacity = properties.opacity;
  }
  
  if (hasPosition) {
    if (properties.x !== undefined) {
      (node as LayoutMixin).x = properties.x;
    }
    if (properties.y !== undefined) {
      (node as LayoutMixin).y = properties.y;
    }
  }
  
  if (hasRotation && properties.rotation !== undefined) {
    (node as LayoutMixin).rotation = properties.rotation;
  }
  
  if (hasScale && properties.scale !== undefined) {
    if ('rescale' in node) {
      (node as any).rescale(properties.scale);
    }
  }
}

figma.ui.onmessage = async (msg: Message) => {
  if (msg.type === 'load-frames') {
    // Get all frames in the current page
    const frames = figma.currentPage.findAll(node => node.type === "FRAME") as FrameNode[];
    
    // Map frames to FrameData structure with layers
    const frameData: FrameData[] = frames.map(frame => ({
      id: frame.id,
      name: frame.name,
      layers: frame.children.map(child => getLayerData(child))
    }));

    figma.ui.postMessage({ type: 'frames-loaded', frames: frameData });
  }

  if (msg.type === 'create-animation-group' && msg.animationGroup) {
    const { animationGroup } = msg;
    const frames = figma.currentPage.findAll(node => node.type === "FRAME") as FrameNode[];
    
    // Find all nodes that match the layer names in the animation group
    const matchedNodes = animationGroup.layerNames.flatMap(name => 
      findNodesByName(name, frames)
    );

    // Store the animation group data for later use
    figma.clientStorage.setAsync(`animation-group-${animationGroup.id}`, animationGroup);
    
    figma.notify(`Created animation group for ${matchedNodes.length} layers`);
  }

  if (msg.type === 'update-keyframe' && msg.animationGroup && msg.keyframe) {
    const { animationGroup, keyframe } = msg;
    const node = figma.getNodeById(keyframe.layerId);
    if (node && 'type' in node && node.type !== 'PAGE') {
      await applyKeyframeProperties(node as SceneNode, keyframe.properties);
      
      // Update the stored animation group
      const updatedGroup = {
        ...animationGroup,
        keyframes: animationGroup.keyframes.map(k => 
          k.id === keyframe.id ? keyframe : k
        )
      };
      
      await figma.clientStorage.setAsync(`animation-group-${animationGroup.id}`, updatedGroup);
    }
  }

  if (msg.type === 'preview-animation' && msg.previewTime !== undefined) {
    // Get all animation groups
    const storageKeys = await figma.clientStorage.keysAsync();
    const animationGroupKeys = storageKeys.filter(key => key.startsWith('animation-group-'));
    
    for (const key of animationGroupKeys) {
      const group: AnimationGroup = await figma.clientStorage.getAsync(key);
      
      // Find the keyframes that surround the current time
      const sortedKeyframes = group.keyframes.sort((a, b) => a.time - b.time);
      const currentKeyframeIndex = sortedKeyframes.findIndex(k => k.time > msg.previewTime!);
      
      if (currentKeyframeIndex > 0) {
        const startKeyframe = sortedKeyframes[currentKeyframeIndex - 1];
        const endKeyframe = sortedKeyframes[currentKeyframeIndex];
        
        // Calculate interpolation progress
        const progress = (msg.previewTime! - startKeyframe.time) / 
                        (endKeyframe.time - startKeyframe.time);
        
        // Find and update all matching nodes
        const frames = figma.currentPage.findAll(node => node.type === "FRAME") as FrameNode[];
        const matchedNodes = group.layerNames.flatMap(name => findNodesByName(name, frames));
        
        for (const node of matchedNodes) {
          // Interpolate properties
          const interpolatedProperties: KeyframeProperties = {};
          for (const [key, startValue] of Object.entries(startKeyframe.properties)) {
            const endValue = endKeyframe.properties[key as keyof KeyframeProperties];
            if (endValue !== undefined && startValue !== undefined) {
              interpolatedProperties[key as keyof KeyframeProperties] = 
                startValue + (endValue - startValue) * progress;
            }
          }
          
          await applyKeyframeProperties(node, interpolatedProperties);
        }
      }
    }
  }

  if (msg.type === 'export-animation') {
    // Implementation for exporting animations will go here
    // This will handle creating HTML/CSS, GIF, or video exports
  }
};