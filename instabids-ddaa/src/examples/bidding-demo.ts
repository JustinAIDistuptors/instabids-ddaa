/**
 * Bidding Domain Demo - Demonstrates how to use the Domain-Driven Agent Architecture
 * with the bidding domain
 * 
 * This example shows how to:
 * 1. Create a bidding agent using the BiddingFactory
 * 2. Define a domain context for the agent
 * 3. Fulfill intents using the agent
 * 4. Handle the results of intent fulfillment
 */

import { DomainAgentContext, DomainIntent, DomainOperationResult } from '../core/domain/domain-agent';
import { BiddingFactory } from '../domains/bidding/bidding-factory';

/**
 * Main demo function
 */
async function runBiddingDemo() {
  console.log('Starting Bidding Domain Demo...');
  console.log('-------------------------------');
  
  // Create a domain context for the agent
  const context: DomainAgentContext = {
    userId: 'user-123',
    userRole: 'homeowner',
    userProfiles: ['homeowner'],
    sessionId: 'session-456',
    requestId: 'request-789',
    timestamp: Date.now(),
    meta: {
      ip: '127.0.0.1',
      userAgent: 'BiddingDemo/1.0'
    }
  };
  
  console.log('Created domain context:', context);
  
  // Create a bidding factory
  const factory = new BiddingFactory();
  
  // Create a bidding agent using the factory
  const biddingAgent = factory.createAgent(context);
  
  console.log('Created bidding agent for domain:', biddingAgent);
  
  // Demo 1: Create a bid card
  console.log('\nDemo 1: Creating a bid card...');
  
  const createBidCardIntent: DomainIntent = {
    operation: 'createBidCard',
    params: {
      title: 'Kitchen Renovation',
      description: 'Complete kitchen renovation including cabinets, countertops, and flooring',
      job_category_id: 'cat-123',
      job_type_id: 'type-456',
      location: {
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        country: 'USA'
      },
      zip_code: '94105',
      budget_min: 15000,
      budget_max: 25000,
      timeline_start: '2025-06-01',
      timeline_end: '2025-07-15',
      bid_deadline: '2025-05-15'
    }
  };
  
  console.log('Intent:', createBidCardIntent);
  
  try {
    const createResult = await biddingAgent.fulfillIntent(createBidCardIntent);
    handleResult('Create Bid Card', createResult);
    
    // If the bid card was created successfully, use its ID for subsequent operations
    if (createResult.success && createResult.data && createResult.data.id) {
      const bidCardId = createResult.data.id;
      
      // Demo 2: Get the bid card details
      console.log('\nDemo 2: Getting bid card details...');
      
      const getBidCardIntent: DomainIntent = {
        operation: 'getBidCard',
        params: {
          id: bidCardId
        }
      };
      
      console.log('Intent:', getBidCardIntent);
      
      const getResult = await biddingAgent.fulfillIntent(getBidCardIntent);
      handleResult('Get Bid Card', getResult);
      
      // Demo 3: Submit a bid (using a different context for a contractor)
      console.log('\nDemo 3: Submitting a bid as a contractor...');
      
      // Create a new context for a contractor
      const contractorContext: DomainAgentContext = {
        userId: 'contractor-789',
        userRole: 'contractor',
        userProfiles: ['contractor'],
        sessionId: 'session-456',
        requestId: 'request-101112',
        timestamp: Date.now(),
        meta: {
          ip: '127.0.0.1',
          userAgent: 'BiddingDemo/1.0'
        }
      };
      
      // Create a new agent for the contractor
      const contractorAgent = factory.createAgent(contractorContext);
      
      const submitBidIntent: DomainIntent = {
        operation: 'submitBid',
        params: {
          bid_card_id: bidCardId,
          amount: 18500,
          scope_of_work: 'Full kitchen renovation including demolition, installation of new cabinets, countertops, and flooring.',
          materials_included: {
            cabinets: 'Shaker style, maple',
            countertops: 'Quartz, 3cm thickness',
            flooring: 'Luxury vinyl plank, waterproof'
          },
          timeline: {
            estimated_start: '2025-06-01',
            estimated_completion: '2025-07-01',
            phases: [
              { name: 'Demolition', duration: '3 days' },
              { name: 'Rough-in', duration: '5 days' },
              { name: 'Cabinet Installation', duration: '3 days' },
              { name: 'Countertop Installation', duration: '2 days' },
              { name: 'Flooring', duration: '3 days' },
              { name: 'Finishing', duration: '5 days' }
            ]
          },
          value_propositions: [
            'Licensed and insured',
            '15 years of experience',
            'Dedicated project manager',
            '2-year workmanship warranty'
          ]
        }
      };
      
      console.log('Intent:', submitBidIntent);
      
      const submitResult = await contractorAgent.fulfillIntent(submitBidIntent);
      handleResult('Submit Bid', submitResult);
      
      // If the bid was submitted successfully, use its ID for subsequent operations
      if (submitResult.success && submitResult.data && submitResult.data.id) {
        const bidId = submitResult.data.id;
        
        // Demo 4: Get the bid details (as the homeowner)
        console.log('\nDemo 4: Getting bid details as the homeowner...');
        
        const getBidIntent: DomainIntent = {
          operation: 'getBid',
          params: {
            id: bidId
          }
        };
        
        console.log('Intent:', getBidIntent);
        
        const getBidResult = await biddingAgent.fulfillIntent(getBidIntent);
        handleResult('Get Bid', getBidResult);
        
        // Demo 5: Accept the bid (as the homeowner)
        console.log('\nDemo 5: Accepting the bid as the homeowner...');
        
        const acceptBidIntent: DomainIntent = {
          operation: 'acceptBid',
          params: {
            bid_id: bidId
          }
        };
        
        console.log('Intent:', acceptBidIntent);
        
        const acceptResult = await biddingAgent.fulfillIntent(acceptBidIntent);
        handleResult('Accept Bid', acceptResult);
      }
    }
  } catch (error) {
    console.error('Error running bidding demo:', error);
  }
  
  console.log('\nBidding Domain Demo completed.');
}

/**
 * Helper function to handle and display operation results
 * 
 * @param operation Name of the operation
 * @param result Result of the operation
 */
function handleResult(operation: string, result: DomainOperationResult) {
  console.log(`\n${operation} Result:`);
  console.log('Success:', result.success);
  
  if (result.success) {
    console.log('Data:', JSON.stringify(result.data, null, 2));
    
    if (result.message) {
      console.log('Message:', result.message);
    }
    
    if (result.meta) {
      console.log('Meta:', result.meta);
    }
  } else {
    console.log('Error:', result.error);
    console.log('Message:', result.message);
    
    if (result.meta) {
      console.log('Meta:', result.meta);
    }
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runBiddingDemo()
    .catch(error => {
      console.error('Unhandled error in bidding demo:', error);
      process.exit(1);
    });
}

// Export the demo function for use in other files
export { runBiddingDemo };
