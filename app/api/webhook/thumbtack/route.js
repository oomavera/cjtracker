import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '../../../lib/telegram';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Log the incoming webhook for debugging
    console.log('Thumbtack webhook received:', JSON.stringify(body, null, 2));
    
    // Extract webhook event information based on Thumbtack API v4 structure
    const { event, data } = body;
    
    if (!event || !event.eventType) {
      console.log('Invalid webhook format - missing event information');
      return NextResponse.json({ success: false, error: 'Invalid webhook format' }, { status: 400 });
    }
    
    // Handle different types of Thumbtack v4 webhook events
    switch (event.eventType) {
      case 'NegotiationCreatedV4':
        await handleNegotiationCreated(data);
        break;
      
      case 'MessageCreatedV4':
        await handleMessageCreated(data);
        break;
      
      case 'ReviewCreatedV4':
        await handleReviewCreated(data);
        break;
      
      case 'IncentiveUsedV4':
        await handleIncentiveUsed(data);
        break;
      
      default:
        console.log('Unhandled webhook event type:', event.eventType);
        // Still send a generic notification for unknown types
        await sendTelegramMessage(
          `🔔 Thumbtack Notification\n\n` +
          `Event Type: ${event.eventType}\n` +
          `Description: ${event.description || 'Unknown event'}\n` +
          `Webhook ID: ${event.webhookID}\n` +
          `Time: ${new Date(event.triggeredAt).toLocaleString()}`
        );
    }
    
    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
    
  } catch (error) {
    console.error('Error processing Thumbtack webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Handle new negotiation (lead) created
async function handleNegotiationCreated(negotiation) {
  const { customer, business, request, createdAt, negotiationID } = negotiation;
  
  const message = `🎯 NEW THUMBTACK NEGOTIATION\n\n` +
    `👤 Customer: ${customer.firstName} ${customer.lastName}\n` +
    `📞 Phone: ${customer.phone || 'Not provided'}\n` +
    `🏢 Business: ${business.name}\n` +
    `🔧 Service: ${request.category.name}\n` +
    `📍 Location: ${request.location.city}, ${request.location.state} ${request.location.zipCode}\n` +
    `💬 Description: ${request.description || 'No description'}\n` +
    `🆔 Negotiation ID: ${negotiationID}\n` +
    `🆔 Business ID: ${business.businessID}\n` +
    `⏰ Time: ${new Date(createdAt).toLocaleString()}`;
  
  await sendTelegramMessage(message);
}

// Handle new message sent
async function handleMessageCreated(messageData) {
  const { customer, business, from, text, sentAt, negotiationID, messageID } = messageData;
  
  const senderName = from === 'Customer' 
    ? `${customer.displayName} (Customer)` 
    : `${business.displayName} (Business)`;
  
  const message = `💬 NEW MESSAGE\n\n` +
    `👤 From: ${senderName}\n` +
    `💬 Message: ${text}\n` +
    `🆔 Negotiation ID: ${negotiationID}\n` +
    `🆔 Message ID: ${messageID}\n` +
    `⏰ Time: ${new Date(sentAt).toLocaleString()}`;
  
  await sendTelegramMessage(message);
}

// Handle new review created
async function handleReviewCreated(reviewData) {
  const { rating, reviewText, reviewerName, createTime, reviewID } = reviewData;
  
  const message = `⭐ NEW REVIEW\n\n` +
    `👤 Reviewer: ${reviewerName}\n` +
    `⭐ Rating: ${rating}/5\n` +
    `💬 Review: ${reviewText || 'No text provided'}\n` +
    `🆔 Review ID: ${reviewID}\n` +
    `⏰ Time: ${new Date(createTime).toLocaleString()}`;
  
  await sendTelegramMessage(message);
}

// Handle incentive used
async function handleIncentiveUsed(incentiveData) {
  const { discount, redemptionTime } = incentiveData;
  
  const discountInfo = discount.name || `Promo Code: ${discount.promoCode}`;
  
  const message = `🎁 INCENTIVE USED\n\n` +
    `🏷️ Discount: ${discountInfo}\n` +
    `⏰ Time: ${new Date(redemptionTime).toLocaleString()}`;
  
  await sendTelegramMessage(message);
}

// Handle GET requests (for webhook verification)
export async function GET(request) {
  return NextResponse.json({ 
    message: 'Thumbtack webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
