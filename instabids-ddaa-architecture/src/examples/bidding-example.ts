/**
 * Bidding Domain Usage Example
 * 
 * This example demonstrates how to use the bidding domain
 * with the Domain-Driven Agent Architecture (DDAA).
 */

import { EventBusFactory } from '../core/events/event-bus';
import { BiddingFactory } from '../domains/bidding/bidding-factory';
import { BiddingIntents } from '../domains/bidding/bidding-guard';

/**
 * Simple example of using the bidding domain
 */
async function simpleBiddingExample() {
  console.log('=== SIMPLE BIDDING EXAMPLE ===');
  
  // Create a bidding agent with default configuration
  const biddingAgent = BiddingFactory.createAgent();
  
  // Submit a bid
  console.log('Submitting bid...');
  const submitResult = await biddingAgent.fulfillIntent(BiddingIntents.SUBMIT_BID, {
    projectId: 'project-123',
    userId: 'contractor-456',
    amount: 2500,
    description: 'Complete bathroom renovation with premium materials',
    timelineInDays: 14,
    materials: ['Ceramic tiles', 'Chrome fixtures', 'Marble countertop']
  });
  
  if (submitResult.success) {
    console.log('Bid submitted successfully:', submitResult.data);
    
    // Get the bid details
    const bidId = submitResult.data.id;
    console.log(`\nRetrieving bid ${bidId}...`);
    
    const getResult = await biddingAgent.fulfillIntent(BiddingIntents.GET_BID, {
      bidId,
      userId: 'contractor-456'
    });
    
    if (getResult.success) {
      console.log('Bid details:', getResult.data);
    }
    
    // Accept the bid as a homeowner
    console.log('\nAccepting bid...');
    const acceptResult = await biddingAgent.fulfillIntent(BiddingIntents.ACCEPT_BID, {
      bidId,
      userId: 'homeowner-789'
    });
    
    if (acceptResult.success) {
      console.log('Bid accepted successfully:', acceptResult.data);
    } else {
      console.error('Failed to accept bid:', acceptResult.error?.message);
    }
  } else {
    console.error('Failed to submit bid:', submitResult.error?.message);
  }
}

/**
 * Advanced example showing cross-domain communication with events
 */
async function crossDomainExample() {
  console.log('\n=== CROSS-DOMAIN EXAMPLE ===');
  
  // Create a shared event bus for cross-domain communication
  const eventBus = EventBusFactory.create('local', { logEvents: true });
  
  // Create bidding domain components
  const { agent: biddingAgent } = BiddingFactory.createComponents({
    useSharedEventBus: true,
    sharedEventBus: eventBus,
    guardConfig: {
      maxBidAmount: 10000,
      minBidAmount: 100
    }
  });
  
  // Subscribe to bidding events
  eventBus.subscribe({
    eventTypes: ['bidding:bid_submitted', 'bidding:bid_accepted'],
    callback: (event) => {
      console.log(`Event received: ${event.type}`, event.payload);
      
      // In a real implementation, this is where other domains would react to events
      // For example, when a bid is accepted, the payment domain might create an escrow account
      if (event.type === 'bidding:bid_accepted') {
        console.log('\nPayment domain: Creating escrow account for accepted bid...');
        console.log(`Amount: $${event.payload.amount}`);
        console.log(`Project ID: ${event.payload.projectId}`);
        console.log(`Contractor ID: ${event.payload.contractorId}`);
      }
    }
  });
  
  // Submit a bid
  console.log('Submitting bid with cross-domain event propagation...');
  const result = await biddingAgent.fulfillIntent(BiddingIntents.SUBMIT_BID, {
    projectId: 'project-xyz',
    userId: 'contractor-abc',
    amount: 5000,
    description: 'Full kitchen renovation',
    timelineInDays: 21
  });
  
  if (result.success) {
    // Accept the bid, which will trigger another event
    console.log('\nAccepting bid, should trigger payment domain functionality...');
    await biddingAgent.fulfillIntent(BiddingIntents.ACCEPT_BID, {
      bidId: result.data.id,
      userId: 'homeowner-def'
    });
  }
}

/**
 * Run the examples
 */
async function runExamples() {
  try {
    await simpleBiddingExample();
    await crossDomainExample();
    
    console.log('\nExamples completed successfully');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// When this file is run directly, execute the examples
if (require.main === module) {
  runExamples();
}

export { simpleBiddingExample, crossDomainExample, runExamples };
