import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Get user's businesses first
    const businessesResponse = await fetch('https://api.thumbtack.com/api/v4/businesses', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!businessesResponse.ok) {
      const errorText = await businessesResponse.text();
      console.error('Failed to fetch businesses:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch businesses' },
        { status: 400 }
      );
    }

    const businessesData = await businessesResponse.json();
    const businesses = businessesData.businesses || [];

    if (businesses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No businesses found for this account' },
        { status: 400 }
      );
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhook/thumbtack`;
    
    // Setup webhooks for each business
    const webhookResults = [];
    
    for (const business of businesses) {
      const businessId = business.id;
      
      // Create business webhooks for different event types
      const webhookEvents = [
        'NegotiationCreatedV4',
        'MessageCreatedV4', 
        'ReviewCreatedV4',
        'IncentiveUsedV4'
      ];

      for (const eventType of webhookEvents) {
        try {
          const webhookResponse = await fetch(`https://api.thumbtack.com/api/v4/businesses/${businessId}/webhooks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: webhookUrl,
              events: [eventType]
            }),
          });

          if (webhookResponse.ok) {
            const webhookData = await webhookResponse.json();
            webhookResults.push({
              businessId,
              businessName: business.name,
              eventType,
              webhookId: webhookData.id,
              success: true
            });
            console.log(`✅ Created webhook for ${business.name} - ${eventType}`);
          } else {
            const errorText = await webhookResponse.text();
            console.error(`❌ Failed to create webhook for ${business.name} - ${eventType}:`, errorText);
            webhookResults.push({
              businessId,
              businessName: business.name,
              eventType,
              success: false,
              error: errorText
            });
          }
        } catch (error) {
          console.error(`❌ Error creating webhook for ${business.name} - ${eventType}:`, error);
          webhookResults.push({
            businessId,
            businessName: business.name,
            eventType,
            success: false,
            error: error.message
          });
        }
      }
    }

    const successfulWebhooks = webhookResults.filter(r => r.success);
    const failedWebhooks = webhookResults.filter(r => !r.success);

    return NextResponse.json({
      success: successfulWebhooks.length > 0,
      message: `Created ${successfulWebhooks.length} webhooks successfully`,
      results: {
        successful: successfulWebhooks,
        failed: failedWebhooks
      },
      webhookUrl
    });

  } catch (error) {
    console.error('Webhook setup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
