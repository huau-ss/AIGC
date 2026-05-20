import 'dotenv/config';
import { rewrite } from './core/router.js';
import { analyzeText, estimateAIGCRisk } from './core/detector.js';

console.log('Academic Rewrite Platform - CLI Mode');
console.log('=====================================\n');

async function demo() {
  const testText = `本研究采用深度学习技术对图像分类任务进行了深入研究。实验结果表明,
  我们的方法在多个基准数据集上取得了显著的性能提升。首先,我们使用ResNet作为基础模型,
  然后通过数据增强和正则化技术进一步提升了模型的泛化能力。实验结果显示,与传统方法相比,
  我们的方法在准确率上提升了15%,同时保持了较低的计算复杂度。因此,本研究为图像分类任务提供了
  一种新的解决思路。`;

  console.log('Original Text:');
  console.log(testText);
  console.log('\n--- Analysis ---\n');

  const analysis = analyzeText(testText);
  console.log('Text Analysis:', JSON.stringify(analysis, null, 2));

  const risk = estimateAIGCRisk(testText);
  console.log('\nAIGC Risk:', JSON.stringify(risk, null, 2));

  console.log('\n--- Rewriting ---\n');

  try {
    const result = await rewrite(testText, { level: 'medium' });
    console.log('Rewritten Text:');
    console.log(result.rewritten);
    console.log('\nChanges:', result.changes.join(', '));
    console.log('Model:', result.model);
  } catch (error) {
    console.error('Rewrite failed:', error);
  }
}

demo();
