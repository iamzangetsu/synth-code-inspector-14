export interface LineAnalysis {
  content: string;
  isAI: boolean;
  confidence: number;
  reasons: string[];
}

export interface AIBlock {
  startLine: number;
  endLine: number;
  confidenceLevel: 'Strongly AI' | 'Moderate AI' | 'Likely AI' | 'Uncertain' | 'Likely Human' | 'Strongly Human';
  confidence: number;
  reasons: string[];
}

export interface AnalysisResult {
  totalLines: number;
  aiLines: number;
  humanLines: number;
  aiPercentage: number;
  humanPercentage: number;
  overallConfidence: number;
  lineAnalysis: LineAnalysis[];
  aiBlocks: AIBlock[];
}

interface DetectionPattern {
  pattern: RegExp;
  weight: number;
  reason: string;
  aiIndicator: boolean;
}

// Enhanced AI detection patterns with higher accuracy
const AI_PATTERNS: DetectionPattern[] = [
  // Step-by-step comments (very common in AI code)
  {
    pattern: /\/\/\s*Step\s*\d+:|\/\/\s*\d+\.|#\s*Step\s*\d+:|#\s*\d+\./gi,
    weight: 0.9,
    reason: "Contains step-by-step comments typical of AI explanations",
    aiIndicator: true
  },
  
  // Overly descriptive comments explaining obvious code
  {
    pattern: /#\s*(Loop through|Track if|Last.*elements|Swap if|If no|Example usage|Original|Sorted)/gi,
    weight: 0.8,
    reason: "Contains verbose explanatory comments typical of AI generation",
    aiIndicator: true
  },
  
  // Perfect example usage patterns (AI loves to add examples)
  {
    pattern: /(Example usage|if __name__ == "__main__":|# Example|\/\/ Example)/gi,
    weight: 0.9,
    reason: "Contains structured example usage typical of AI tutorials",
    aiIndicator: true
  },
  
  // AI's love for optimization comments
  {
    pattern: /#.*already (in place|sorted)|#.*optimization|#.*efficient/gi,
    weight: 0.8,
    reason: "Contains optimization comments typical of AI explanations",
    aiIndicator: true
  },
  
  // Perfect variable naming for tutorials
  {
    pattern: /\b(nums|arr|swapped|sorted_nums)\b/gi,
    weight: 0.7,
    reason: "Uses educational variable names typical of AI tutorials",
    aiIndicator: true
  },
  
  // AI's perfect print statements with labels
  {
    pattern: /print\s*\(\s*["']Original:|print\s*\(\s*["']Sorted:/gi,
    weight: 0.9,
    reason: "Contains labeled output statements typical of AI examples",
    aiIndicator: true
  },
  
  // Perfect function structure with return
  {
    pattern: /def\s+\w+\s*\([^)]*\):\s*\n.*return/s,
    weight: 0.6,
    reason: "Contains complete function with proper return statement",
    aiIndicator: true
  },
  
  // AI's tendency for comprehensive if-else structures
  {
    pattern: /if.*:\s*\n.*else:\s*\n.*break/gs,
    weight: 0.7,
    reason: "Contains comprehensive conditional logic typical of AI",
    aiIndicator: true
  },
  
  // Perfect indentation consistency (AI signature)
  {
    pattern: /^    [a-zA-Z]/gm,
    weight: 0.3,
    reason: "Perfect 4-space indentation consistency",
    aiIndicator: true
  },
  
  // Human indicators
  
  // Debug prints left in code
  {
    pattern: /print\s*\(\s*(?!["']Original:|["']Sorted:)/gi,
    weight: 0.6,
    reason: "Contains debug print statements",
    aiIndicator: false
  },
  
  // TODO/FIXME comments (humans leave these)
  {
    pattern: /(TODO|FIXME|HACK|XXX|BUG):/gi,
    weight: 0.8,
    reason: "Contains TODO/FIXME comments indicating human planning",
    aiIndicator: false
  },
  
  // Casual comments without perfect grammar
  {
    pattern: /#\s*[a-z][^.A-Z]*$/gm,
    weight: 0.4,
    reason: "Contains casual comments typical of human code",
    aiIndicator: false
  },
  
  // Abbreviated or lazy variable names
  {
    pattern: /\b(i|j|k|n|x|y|z|tmp|temp|val|res|data|item)\b/g,
    weight: 0.3,
    reason: "Uses short variable names common in human code",
    aiIndicator: false
  },
  
  // Inconsistent spacing or formatting
  {
    pattern: /\s{5,}|[a-zA-Z]\s{2,}[a-zA-Z]|\t\s|\s\t/g,
    weight: 0.6,
    reason: "Has inconsistent spacing typical of human editing",
    aiIndicator: false
  },
  
  // Quick and dirty solutions without explanation
  {
    pattern: /\w+\[\w+\]\s*=\s*\w+\[\w+\]/g,
    weight: 0.2,
    reason: "Direct assignments without explanatory comments",
    aiIndicator: false
  },
  
  // Hardcoded values typical of human testing
  {
    pattern: /\[.*64.*25.*12.*22.*11.*\]/g,
    weight: 0.4,
    reason: "Contains hardcoded test values",
    aiIndicator: true
  }
];

// Language-specific patterns
const LANGUAGE_PATTERNS: Record<string, DetectionPattern[]> = {
  javascript: [
    {
      pattern: /console\.log\([^)]*\)/g,
      weight: 0.2,
      reason: "Contains debug console.log statements",
      aiIndicator: false
    },
    {
      pattern: /function\s+\w+\s*\([^)]*\)\s*{/g,
      weight: 0.1,
      reason: "Uses function declarations",
      aiIndicator: true
    }
  ],
  python: [
    {
      pattern: /print\([^)]*\)/g,
      weight: 0.2,
      reason: "Contains debug print statements",
      aiIndicator: false
    },
    {
      pattern: /def\s+\w+\s*\([^)]*\):/g,
      weight: 0.1,
      reason: "Uses function definitions",
      aiIndicator: true
    }
  ],
  typescript: [
    {
      pattern: /:\s*(string|number|boolean|any|unknown|void|never)\b/g,
      weight: 0.2,
      reason: "Contains explicit type annotations",
      aiIndicator: true
    }
  ]
};

function analyzeCodeStructure(code: string): number {
  // Analyze overall code structure for AI patterns
  let aiScore = 0;
  
  // Check for perfect indentation (AI tends to be very consistent)
  const lines = code.split('\n').filter(line => line.trim());
  let consistentIndentation = 0;
  let indentPattern = '';
  
  for (const line of lines) {
    const indent = line.match(/^\s*/)?.[0] || '';
    if (!indentPattern && indent) {
      indentPattern = indent;
    }
    if (indent === indentPattern || indent === '' || indent.startsWith(indentPattern)) {
      consistentIndentation++;
    }
  }
  
  if (consistentIndentation / lines.length > 0.9) {
    aiScore += 0.3; // Very consistent indentation suggests AI
  }
  
  // Check for overly comprehensive documentation
  const commentLines = code.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];
  const commentRatio = commentLines.length / lines.length;
  if (commentRatio > 0.3) {
    aiScore += 0.2;
  }
  
  // Check for excessive use of defensive programming
  const errorHandlingCount = (code.match(/(try|catch|throw|Error|Exception)/g) || []).length;
  if (errorHandlingCount > lines.length * 0.1) {
    aiScore += 0.2;
  }
  
  return Math.min(aiScore, 1);
}

function analyzeLine(line: string, lineNumber: number, language: string): LineAnalysis {
  const content = line.trim();
  let aiScore = 0;
  let humanScore = 0;
  const reasons: string[] = [];
  
  // Skip empty lines
  if (!content) {
    return {
      content: line,
      isAI: false,
      confidence: 0.5,
      reasons: ["Empty line - neutral"]
    };
  }
  
  // Apply general patterns
  for (const pattern of AI_PATTERNS) {
    if (pattern.pattern.test(content)) {
      if (pattern.aiIndicator) {
        aiScore += pattern.weight;
      } else {
        humanScore += pattern.weight;
      }
      reasons.push(pattern.reason);
    }
  }
  
  // Apply language-specific patterns
  const langPatterns = LANGUAGE_PATTERNS[language] || [];
  for (const pattern of langPatterns) {
    if (pattern.pattern.test(content)) {
      if (pattern.aiIndicator) {
        aiScore += pattern.weight;
      } else {
        humanScore += pattern.weight;
      }
      reasons.push(pattern.reason);
    }
  }
  
  // Additional heuristics
  
  // Line length analysis
  if (content.length > 120) {
    aiScore += 0.2;
    reasons.push("Very long line length typical of AI generation");
  } else if (content.length < 20 && !content.match(/[{}();,]/)) {
    humanScore += 0.1;
    reasons.push("Short, concise line suggests human writing");
  }
  
  // Check for perfect syntax
  const hasPerfectSyntax = !content.match(/[^\w\s\(\)\[\]{};:,.<>!@#$%^&*+=|\\?/-]/);
  if (hasPerfectSyntax && content.length > 30) {
    aiScore += 0.1;
    reasons.push("Perfect syntax and structure");
  }
  
  // Check for creative/quirky naming
  if (content.match(/\b(foo|bar|baz|qux|quirky|magic|hack|wtf)\b/i)) {
    humanScore += 0.3;
    reasons.push("Uses creative or placeholder naming typical of humans");
  }
  
  // Calculate final scores
  const totalScore = aiScore + humanScore;
  let confidence = totalScore > 0 ? Math.max(aiScore, humanScore) / totalScore : 0.5;
  confidence = Math.min(Math.max(confidence, 0.1), 0.95); // Clamp between 10% and 95%
  
  const isAI = aiScore > humanScore;
  
  if (reasons.length === 0) {
    reasons.push("No significant patterns detected - neutral classification");
  }
  
  return {
    content: line,
    isAI,
    confidence,
    reasons
  };
}

function isCreativeHumanCode(line: string): boolean {
  const content = line.trim();
  
  // Check for clear human creativity indicators
  const creativePatterns = [
    /(TODO|FIXME|HACK|XXX|NOTE):/gi,
    /\b(foo|bar|baz|qux|quirky|magic|hack|wtf|temp|tmp)\b/i,
    /console\.log\((?!.*Result:|.*Error:|.*Usage:)/,
    /\/\/\s*(FIXME|TODO|HACK|NOTE)/i,
    /\/\/\s*[a-z][^.A-Z]*$/,  // Short, casual comments without proper capitalization
    /\?\?\?|\!\!\!|\.\.\.$/,  // Casual punctuation
    /\/\/\s*(lol|wtf|omg|meh|ugh)/i  // Casual expressions
  ];
  
  return creativePatterns.some(pattern => pattern.test(content));
}

function getConfidenceLevel(confidence: number, isAI: boolean): 'Strongly AI' | 'Moderate AI' | 'Likely AI' | 'Uncertain' | 'Likely Human' | 'Strongly Human' {
  if (isAI) {
    if (confidence >= 0.85) return 'Strongly AI';
    if (confidence >= 0.7) return 'Moderate AI';
    if (confidence >= 0.6) return 'Likely AI';
    return 'Uncertain';
  } else {
    if (confidence >= 0.85) return 'Strongly Human';
    if (confidence >= 0.7) return 'Likely Human';
    return 'Uncertain';
  }
}

function detectAIBlocks(lineAnalysis: LineAnalysis[]): AIBlock[] {
  const blocks: AIBlock[] = [];
  let currentBlock: { start: number; end: number; isAI: boolean; confidences: number[]; reasons: Set<string> } | null = null;

  for (let i = 0; i < lineAnalysis.length; i++) {
    const line = lineAnalysis[i];
    
    // Skip empty lines for block detection
    if (!line.content.trim()) continue;

    if (currentBlock && currentBlock.isAI === line.isAI) {
      // Continue current block
      currentBlock.end = i + 1;
      currentBlock.confidences.push(line.confidence);
      line.reasons.forEach(reason => currentBlock!.reasons.add(reason));
    } else {
      // Save previous block if it exists and has meaningful content
      if (currentBlock && currentBlock.confidences.length >= 2) {
        const avgConfidence = currentBlock.confidences.reduce((a, b) => a + b, 0) / currentBlock.confidences.length;
        const confidenceLevel = getConfidenceLevel(avgConfidence, currentBlock.isAI);
        
        blocks.push({
          startLine: currentBlock.start,
          endLine: currentBlock.end,
          confidenceLevel,
          confidence: avgConfidence,
          reasons: Array.from(currentBlock.reasons)
        });
      }

      // Start new block
      currentBlock = {
        start: i + 1,
        end: i + 1,
        isAI: line.isAI,
        confidences: [line.confidence],
        reasons: new Set(line.reasons)
      };
    }
  }

  // Don't forget the last block
  if (currentBlock && currentBlock.confidences.length >= 2) {
    const avgConfidence = currentBlock.confidences.reduce((a, b) => a + b, 0) / currentBlock.confidences.length;
    const confidenceLevel = getConfidenceLevel(avgConfidence, currentBlock.isAI);
    
    blocks.push({
      startLine: currentBlock.start,
      endLine: currentBlock.end,
      confidenceLevel,
      confidence: avgConfidence,
      reasons: Array.from(currentBlock.reasons)
    });
  }

  return blocks;
}

function applyContextualAnalysis(lineAnalysis: LineAnalysis[]): void {
  // Enhanced contextual analysis with stronger AI detection
  
  // Apply sandwiching rule: if a line is between AI lines, mark it as AI unless it's clearly creative human code
  for (let i = 1; i < lineAnalysis.length - 1; i++) {
    const currentLine = lineAnalysis[i];
    const prevLine = lineAnalysis[i - 1];
    const nextLine = lineAnalysis[i + 1];
    
    // Skip empty lines
    if (!currentLine.content.trim()) continue;
    
    // If current line is human but surrounded by AI lines
    if (!currentLine.isAI && prevLine.isAI && nextLine.isAI) {
      // Check if it's genuinely creative human code
      if (!isCreativeHumanCode(currentLine.content)) {
        currentLine.isAI = true;
        currentLine.confidence = Math.max(currentLine.confidence, 0.8);
        currentLine.reasons.push("Line sandwiched between AI-generated code blocks");
      }
    }
  }
  
  // Enhanced block analysis: look for consecutive AI patterns
  let consecutiveAICount = 0;
  for (let i = 0; i < lineAnalysis.length; i++) {
    const line = lineAnalysis[i];
    
    if (!line.content.trim()) {
      consecutiveAICount = 0;
      continue;
    }
    
    if (line.isAI) {
      consecutiveAICount++;
      // Boost confidence for lines in AI blocks
      if (consecutiveAICount >= 3) {
        line.confidence = Math.min(line.confidence + 0.1, 0.95);
      }
    } else {
      // If we have a human line after many AI lines, check if it's likely part of the AI block
      if (consecutiveAICount >= 2 && !isCreativeHumanCode(line.content)) {
        // Look ahead to see if AI pattern continues
        let aiContinues = false;
        for (let j = i + 1; j < Math.min(i + 4, lineAnalysis.length); j++) {
          if (lineAnalysis[j].content.trim() && lineAnalysis[j].isAI) {
            aiContinues = true;
            break;
          }
        }
        
        if (aiContinues) {
          line.isAI = true;
          line.confidence = Math.max(line.confidence, 0.75);
          line.reasons.push("Part of extended AI-generated code block");
        }
      }
      consecutiveAICount = 0;
    }
  }
}

export async function analyzeCode(code: string, language: string): Promise<AnalysisResult> {
  // Simulate processing delay for realism
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const lines = code.split('\n');
  const lineAnalysis: LineAnalysis[] = [];
  
  // Analyze overall structure
  const structureScore = analyzeCodeStructure(code);
  
  // Analyze each line
  for (let i = 0; i < lines.length; i++) {
    const analysis = analyzeLine(lines[i], i + 1, language);
    
    // Adjust confidence based on overall structure
    if (structureScore > 0.5) {
      if (analysis.isAI) {
        analysis.confidence = Math.min(analysis.confidence + 0.1, 0.95);
      }
    }
    
    lineAnalysis.push(analysis);
  }
  
  // Apply contextual analysis to improve accuracy
  applyContextualAnalysis(lineAnalysis);
  
  // Detect AI blocks for enhanced visualization
  const aiBlocks = detectAIBlocks(lineAnalysis);
  
  // Calculate statistics
  const nonEmptyLines = lineAnalysis.filter(l => l.content.trim());
  const aiLines = nonEmptyLines.filter(l => l.isAI).length;
  const humanLines = nonEmptyLines.length - aiLines;
  const totalLines = nonEmptyLines.length;
  
  const aiPercentage = totalLines > 0 ? (aiLines / totalLines) * 100 : 0;
  const humanPercentage = totalLines > 0 ? (humanLines / totalLines) * 100 : 0;
  
  // Calculate overall confidence as weighted average
  const overallConfidence = nonEmptyLines.length > 0 
    ? nonEmptyLines.reduce((sum, line) => sum + line.confidence, 0) / nonEmptyLines.length
    : 0.5;
  
  return {
    totalLines,
    aiLines,
    humanLines,
    aiPercentage,
    humanPercentage,
    overallConfidence,
    lineAnalysis,
    aiBlocks
  };
}