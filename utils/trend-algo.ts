import { Trend } from '../types';

/**
 * Calculates the raw heat score for a trend based on engagement metrics.
 * Formula: (viewCount * 1) + (likeCount * 5) + (commentCount * 10)
 * Commercial trends are penalized by 50%.
 */
export const calculateHeatScore = (trend: Trend): number => {
  const views = trend.viewCount || 0;
  const likes = trend.likeCount || 0;
  const comments = trend.commentCount || 0;

  let score = (views * 1) + (likes * 5) + (comments * 10);

  if (trend.isCommercial) {
    score *= 0.5;
  }

  return Math.round(score);
};

/**
 * Formats large numbers (e.g. 12500 -> 1.2w)
 */
export const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};