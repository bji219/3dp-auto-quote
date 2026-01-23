import { prisma } from '@/lib/prisma';

/**
 * Subscribe an email to the mailing list
 */
export async function subscribeToMailingList(
  email: string,
  options?: {
    source?: string;
    tags?: string[];
  }
): Promise<{
  success: boolean;
  message: string;
  subscriber?: any;
}> {
  try {
    // Check if email already exists
    const existing = await prisma.mailingListSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.isSubscribed) {
        return {
          success: true,
          message: 'Email already subscribed',
          subscriber: existing,
        };
      }

      // Re-subscribe if previously unsubscribed
      const updated = await prisma.mailingListSubscriber.update({
        where: { email },
        data: {
          isSubscribed: true,
          subscribedAt: new Date(),
          unsubscribedAt: null,
          source: options?.source || existing.source,
          tags: options?.tags ? JSON.stringify(options.tags) : existing.tags,
        },
      });

      return {
        success: true,
        message: 'Re-subscribed successfully',
        subscriber: updated,
      };
    }

    // Create new subscriber
    const subscriber = await prisma.mailingListSubscriber.create({
      data: {
        email,
        isSubscribed: true,
        source: options?.source || 'manual',
        tags: options?.tags ? JSON.stringify(options.tags) : null,
      },
    });

    return {
      success: true,
      message: 'Subscribed successfully',
      subscriber,
    };
  } catch (error) {
    console.error('Failed to subscribe email:', error);
    return {
      success: false,
      message: 'Failed to subscribe to mailing list',
    };
  }
}

/**
 * Unsubscribe an email from the mailing list
 */
export async function unsubscribeFromMailingList(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const subscriber = await prisma.mailingListSubscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return {
        success: false,
        message: 'Email not found in mailing list',
      };
    }

    if (!subscriber.isSubscribed) {
      return {
        success: true,
        message: 'Email already unsubscribed',
      };
    }

    await prisma.mailingListSubscriber.update({
      where: { email },
      data: {
        isSubscribed: false,
        unsubscribedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Unsubscribed successfully',
    };
  } catch (error) {
    console.error('Failed to unsubscribe email:', error);
    return {
      success: false,
      message: 'Failed to unsubscribe from mailing list',
    };
  }
}

/**
 * Check if an email is subscribed
 */
export async function isSubscribed(email: string): Promise<boolean> {
  try {
    const subscriber = await prisma.mailingListSubscriber.findUnique({
      where: { email },
    });

    return subscriber?.isSubscribed || false;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}

/**
 * Update subscriber tags
 */
export async function updateSubscriberTags(
  email: string,
  tags: string[]
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const subscriber = await prisma.mailingListSubscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return {
        success: false,
        message: 'Subscriber not found',
      };
    }

    await prisma.mailingListSubscriber.update({
      where: { email },
      data: {
        tags: JSON.stringify(tags),
      },
    });

    return {
      success: true,
      message: 'Tags updated successfully',
    };
  } catch (error) {
    console.error('Failed to update tags:', error);
    return {
      success: false,
      message: 'Failed to update tags',
    };
  }
}

/**
 * Add tags to a subscriber (without removing existing tags)
 */
export async function addSubscriberTags(
  email: string,
  newTags: string[]
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const subscriber = await prisma.mailingListSubscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return {
        success: false,
        message: 'Subscriber not found',
      };
    }

    // Normalize tags: handle JSON string | null by converting to array
    let existingTags: string[] = [];
    if (subscriber.tags) {
      try {
        existingTags = JSON.parse(subscriber.tags);
      } catch {
        // If not valid JSON, treat as comma-separated
        existingTags = subscriber.tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    const combinedTags = Array.from(new Set([...existingTags, ...newTags]));

    await prisma.mailingListSubscriber.update({
      where: { email },
      data: {
        tags: JSON.stringify(combinedTags),
      },
    });

    return {
      success: true,
      message: 'Tags added successfully',
    };
  } catch (error) {
    console.error('Failed to add tags:', error);
    return {
      success: false,
      message: 'Failed to add tags',
    };
  }
}

/**
 * Record that an email was sent to a subscriber
 */
export async function recordEmailSent(email: string): Promise<void> {
  try {
    await prisma.mailingListSubscriber.updateMany({
      where: { email, isSubscribed: true },
      data: { lastEmailSent: new Date() },
    });
  } catch (error) {
    console.error('Failed to record email sent:', error);
  }
}

/**
 * Get all active subscribers
 */
export async function getActiveSubscribers(options?: {
  tags?: string[];
  limit?: number;
  offset?: number;
}): Promise<Array<{ email: string; tags: string[] | null }>> {
  try {
    const where: any = {
      isSubscribed: true,
    };

    // Filter by tags if provided
    if (options?.tags && options.tags.length > 0) {
      where.tags = {
        hasSome: options.tags,
      };
    }

    const subscribers = await prisma.mailingListSubscriber.findMany({
      where,
      select: {
        email: true,
        tags: true,
      },
      take: options?.limit,
      skip: options?.offset,
      orderBy: {
        subscribedAt: 'desc',
      },
    });

    return subscribers.map((s) => ({
      email: s.email,
      tags: s.tags as string[] | null,
    }));
  } catch (error) {
    console.error('Failed to get active subscribers:', error);
    return [];
  }
}

/**
 * Get subscriber statistics
 */
export async function getSubscriberStats(): Promise<{
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribed: number;
  recentSubscribers: number;
}> {
  try {
    const [total, active, unsubscribed, recent] = await Promise.all([
      prisma.mailingListSubscriber.count(),
      prisma.mailingListSubscriber.count({ where: { isSubscribed: true } }),
      prisma.mailingListSubscriber.count({ where: { isSubscribed: false } }),
      prisma.mailingListSubscriber.count({
        where: {
          isSubscribed: true,
          subscribedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      totalSubscribers: total,
      activeSubscribers: active,
      unsubscribed,
      recentSubscribers: recent,
    };
  } catch (error) {
    console.error('Failed to get subscriber stats:', error);
    return {
      totalSubscribers: 0,
      activeSubscribers: 0,
      unsubscribed: 0,
      recentSubscribers: 0,
    };
  }
}
