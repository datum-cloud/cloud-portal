/**
 * Get context-aware sort labels based on column type
 */
export const getSortLabels = (
  sortType?: 'text' | 'number' | 'date' | 'boolean' | 'array',
  customLabels?: { asc?: string; desc?: string }
): { asc: string; desc: string } => {
  // Use custom labels if provided
  if (customLabels?.asc && customLabels?.desc) {
    return {
      asc: customLabels.asc,
      desc: customLabels.desc,
    };
  }

  // Return type-specific labels
  switch (sortType) {
    case 'text':
      return {
        asc: 'A → Z',
        desc: 'Z → A',
      };
    case 'number':
      return {
        asc: 'Low → High',
        desc: 'High → Low',
      };
    case 'date':
      return {
        asc: 'Oldest First',
        desc: 'Newest First',
      };
    case 'array':
      return {
        asc: 'Fewest First',
        desc: 'Most First',
      };
    case 'boolean':
      return {
        asc: 'False → True',
        desc: 'True → False',
      };
    default:
      return {
        asc: 'Ascending',
        desc: 'Descending',
      };
  }
};
