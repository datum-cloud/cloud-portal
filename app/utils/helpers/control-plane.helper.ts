import {
  ControlPlaneStatus,
  IExtendedControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';

/**
 * Enhanced status extraction options
 */
export interface TransformStatusOptions {
  /**
   * Which conditions must be True for Success status
   * @default Auto-detect - Uses intelligent detection based on available conditions
   *
   * Auto-detection modes:
   * - undefined (default): Smart detection based on condition types
   * - null: Check ALL conditions (all must be True for success)
   * - string[]: Check specific conditions only
   *
   * Auto-detection priority (when undefined):
   * 1. If 'Ready' condition exists → use ['Ready']
   * 2. If 'Accepted' + 'Programmed' exist → use ['Accepted', 'Programmed']
   * 3. If only 'Accepted' exists → use ['Accepted']
   * 4. Otherwise → use first condition
   *
   * Manual override examples:
   * - ['Ready'] - Projects, most core resources
   * - ['Accepted', 'Programmed'] - DNS records, complex resources
   * - null - Check all conditions (strictest mode)
   */
  requiredConditions?: string[] | null;

  /**
   * Whether to include detailed condition info
   * @default false
   */
  includeConditionDetails?: boolean;
}

/**
 * Auto-detect required conditions based on available conditions
 * Uses intelligent priority-based detection for common K8s patterns
 *
 * Priority order:
 * 1. 'Ready' - Most common for core resources (Projects, etc.)
 * 2. 'Accepted' + 'Programmed' - Complex resources (DNS records, etc.)
 * 3. 'Accepted' alone - Simple accepted resources
 * 4. First available condition - Fallback
 */
function autoDetectRequiredConditions(conditionMap: Map<string, any>): string[] {
  // Priority 1: Ready condition (most common for core resources)
  if (conditionMap.has('Ready')) {
    return ['Ready'];
  }

  // Priority 2: Accepted + Programmed (complex resources like DNS)
  if (conditionMap.has('Accepted') && conditionMap.has('Programmed')) {
    return ['Accepted', 'Programmed'];
  }

  // Priority 3: Accepted only (simple resources)
  if (conditionMap.has('Accepted')) {
    return ['Accepted'];
  }

  // Fallback: Use first available condition
  const firstCondition = Array.from(conditionMap.keys())[0];
  return firstCondition ? [firstCondition] : [];
}

/**
 * Universal status transformer for all Control Plane resources
 *
 * Supports both simple (single condition) and complex (multiple conditions) resources
 * Includes automatic condition detection for maximum flexibility
 *
 * @param status - K8s status object from resource
 * @param options - Extraction options
 *
 * @example Auto-detection (recommended - smart default)
 * transformControlPlaneStatus(project.status)
 * // Auto-detects 'Ready' condition → { status: 'success', message: '' }
 *
 * @example Check ALL conditions (strictest mode)
 * transformControlPlaneStatus(resource.status, {
 *   requiredConditions: null
 * })
 * // All conditions must be True for success
 *
 * @example Manual override for DNS records
 * transformControlPlaneStatus(dnsRecord.status, {
 *   requiredConditions: ['Accepted', 'Programmed'],
 *   includeConditionDetails: true
 * })
 * // → { status: 'pending', message: '...', isProgrammed: false, programmedReason: 'InvalidDNSRecordSet' }
 */
export function transformControlPlaneStatus(
  status: any,
  options: TransformStatusOptions = {}
): IExtendedControlPlaneStatus {
  const { includeConditionDetails = false } = options;

  // No status object
  if (!status) {
    return {
      status: ControlPlaneStatus.Pending,
      message: 'Resource is being provisioned',
    };
  }

  const { conditions = [], ...rest } = status;

  // No conditions available
  if (conditions.length === 0) {
    return {
      status: ControlPlaneStatus.Pending,
      message: 'Resource is being provisioned',
    };
  }

  // Parse conditions into a map for easy lookup
  const conditionMap = new Map<string, any>();
  conditions.forEach((c: any) => {
    conditionMap.set(c.type, c);
  });

  // Determine which conditions to check
  let requiredConditions: string[];

  if (options.requiredConditions === null) {
    // Mode 1: Check ALL conditions (strictest)
    requiredConditions = Array.from(conditionMap.keys());
  } else if (options.requiredConditions === undefined) {
    // Mode 2: Auto-detect (smart default)
    requiredConditions = autoDetectRequiredConditions(conditionMap);
  } else {
    // Mode 3: Use specified conditions (manual override)
    requiredConditions = options.requiredConditions;
  }

  // Check if all required conditions are True
  const allConditionsMet = requiredConditions.every((condType) => {
    const condition = conditionMap.get(condType);
    return condition?.status === 'True';
  });

  // Determine status
  let finalStatus: ControlPlaneStatus;
  let finalMessage: string = '';

  if (allConditionsMet) {
    finalStatus = ControlPlaneStatus.Success;
  } else {
    finalStatus = ControlPlaneStatus.Pending;

    // Collect messages from non-True conditions
    const messages: string[] = [];
    const seenMessages = new Set<string>(); // Track duplicates

    requiredConditions.forEach((condType) => {
      const condition = conditionMap.get(condType);
      if (condition?.status !== 'True') {
        const message = condition?.message || `Awaiting ${condType.toLowerCase()}`;

        // Only add if we haven't seen this exact message before
        if (!seenMessages.has(message.toLowerCase())) {
          messages.push(message);
          seenMessages.add(message.toLowerCase());
        }
      }
    });

    finalMessage = messages.length > 0 ? messages.join('; ') : 'Resource is being provisioned';
  }

  // Base response
  const response: IExtendedControlPlaneStatus = {
    status: finalStatus,
    message: finalMessage,
    ...rest,
  };

  // Add detailed condition info if requested
  if (includeConditionDetails) {
    const programmed = conditionMap.get('Programmed');
    const accepted = conditionMap.get('Accepted');

    if (programmed) {
      response.isProgrammed = programmed.status === 'True';
      response.programmedReason = programmed.reason;
    }

    if (accepted) {
      response.isAccepted = accepted.status === 'True';
      response.acceptedReason = accepted.reason;
    }

    // Include all conditions for advanced usage
    response.conditions = conditions.map((c: any) => ({
      type: c.type,
      status: c.status,
      reason: c.reason,
      message: c.message,
    }));
  }

  return response;
}

/**
 * Check if a dashboard item is considered completed
 * An item is considered completed if:
 * - There are resources for that item (e.g., domains.length > 0)
 * - OR the project annotation indicates it was skipped
 *
 * @param project - The project object with annotations
 * @param hasResources - Whether resources exist for this dashboard item
 * @param annotationKey - The annotation key to check (e.g., 'dashboard.domains.skipped')
 * @returns true if the dashboard item is completed (has resources or is skipped)
 *
 * @example
 * isDashboardItemCompleted(project, domains.length > 0, 'dashboard.domains.skipped')
 * // Returns true if domains exist OR if the annotation is set to 'true'
 */
export function isDashboardItemCompleted(
  project: { annotations?: Record<string, string> },
  hasResources: boolean,
  annotationKey: string
): boolean {
  return hasResources || project.annotations?.[annotationKey] === 'true';
}
