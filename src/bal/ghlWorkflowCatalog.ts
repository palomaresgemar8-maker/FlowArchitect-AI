import type { LibraryNodeTemplate, NodeRole } from '../types/workflow';

function makeGhlNode(
  id: string,
  category: string,
  role: NodeRole,
  iconName: string,
  ghlTitle: string,
  operation: string,
  subtitle: string,
  mins = 5,
  extra?: Partial<LibraryNodeTemplate>
): LibraryNodeTemplate {
  return {
    id,
    nodeGroup: 'core',
    appPlatform: 'GoHighLevel',
    category,
    role,
    originPlatform: 'ghl',
    iconName,
    operation,
    defaultLabel: {
      ghl: ghlTitle,
      n8n: `GHL: ${ghlTitle}`,
      make: `HighLevel: ${ghlTitle}`,
      zapier: `GoHighLevel: ${ghlTitle}`,
    },
    defaultService: {
      ghl: `ghl.workflow.${role}.${id.replace('ghl_', '')}`,
      n8n: `n8n-nodes-base.highLevel`,
      make: `highLevel:${operation.split(':')[1]?.trim() || 'Action'}`,
      zapier: `LeadConnector`,
    },
    subtitle,
    estimatedTimeSavedMins: mins,
    ...extra,
  };
}

export const GHL_TRIGGER_CATEGORIES = [
  'Contact',
  'Events, Forms & Web',
  'Communication & Reputation',
  'Appointments & Bookings',
  'Opportunities & Pipeline',
  'Payments, Commerce & Shopify',
  'Social & Ad Channels',
  'Memberships, Courses & Communities',
  'Affiliates & IVR',
] as const;

export const GHL_ACTION_CATEGORIES = [
  'Flow Control & Internal Tools',
  'Contact & CRM Management',
  'Communication',
  'Appointments, Pipelines & Payments',
  'Workflow AI & AI Employee',
  'Marketing, Courses, Communities, Affiliates & IVR',
  'Native App Integrations',
] as const;

// ============================================================================
// 1. GHL BUILT-IN WORKFLOW TRIGGERS (ENTRY NODES)
// ============================================================================
export const GHL_BUILTIN_TRIGGERS: LibraryNodeTemplate[] = [
  // --- Category: Contact ---
  makeGhlNode(
    'ghl_trig_contact_created',
    'Contact',
    'trigger',
    'crm',
    'Contact Created',
    'trigger: onContactCreated',
    'Fires when a new contact is added to the CRM'
  ),
  makeGhlNode(
    'ghl_trig_contact_changed',
    'Contact',
    'trigger',
    'crm',
    'Contact Changed',
    'trigger: onContactChanged',
    'Fires when specified contact fields are updated'
  ),
  makeGhlNode(
    'ghl_trig_contact_tag',
    'Contact',
    'trigger',
    'crm',
    'Contact Tag',
    'trigger: onTagAddedOrRemoved',
    'Fires when specific tags are added or removed'
  ),
  makeGhlNode(
    'ghl_trig_contact_dnd',
    'Contact',
    'trigger',
    'crm',
    'Contact DND',
    'trigger: onDndToggled',
    'Fires when Do Not Disturb is enabled or disabled (overall or per channel)'
  ),
  makeGhlNode(
    'ghl_trig_birthday_reminder',
    'Contact',
    'trigger',
    'calendar',
    'Birthday Reminder',
    'trigger: onBirthdayReminder',
    "Fires on the contact's birth date"
  ),
  makeGhlNode(
    'ghl_trig_custom_date_reminder',
    'Contact',
    'trigger',
    'calendar',
    'Custom Date Reminder',
    'trigger: onCustomDateReminder',
    'Fires based on a custom date field on the contact record'
  ),
  makeGhlNode(
    'ghl_trig_note_added_changed',
    'Contact',
    'trigger',
    'file-text',
    'Note Added / Note Changed',
    'trigger: onNoteChanged',
    'Fires when a note is created or modified on a contact'
  ),
  makeGhlNode(
    'ghl_trig_task_events',
    'Contact',
    'trigger',
    'tasks',
    'Task Added / Task Reminder / Task Completed',
    'trigger: onTaskEvent',
    'Fires when tasks are created, due, or checked off'
  ),
  makeGhlNode(
    'ghl_trig_contact_engagement_score',
    'Contact',
    'trigger',
    'crm',
    'Contact Engagement Score',
    'trigger: onEngagementScoreThreshold',
    "Fires when a contact's engagement score crosses a threshold"
  ),
  makeGhlNode(
    'ghl_trig_prospect_generated',
    'Contact',
    'trigger',
    'crm',
    'Prospect Generated',
    'trigger: onProspectGenerated',
    'Fires when a new prospect record is generated via prospecting tools'
  ),

  // --- Category: Events, Forms & Web ---
  makeGhlNode(
    'ghl_trig_customer_replied',
    'Events, Forms & Web',
    'trigger',
    'message-square',
    'Customer / User Replied',
    'trigger: onCustomerReplied',
    'Fires when an inbound reply arrives via SMS, Email, FB, IG, WhatsApp, or Live Chat'
  ),
  makeGhlNode(
    'ghl_trig_form_survey_submitted',
    'Events, Forms & Web',
    'trigger',
    'file-text',
    'Form Submitted / Survey Submitted / Quiz Submitted',
    'trigger: onFormOrSurveySubmitted',
    'Fires when a native GHL form, survey, or quiz is completed'
  ),
  makeGhlNode(
    'ghl_trig_trigger_link_clicked',
    'Events, Forms & Web',
    'trigger',
    'globe',
    'Trigger Link Clicked',
    'trigger: onTriggerLinkClicked',
    'Fires when a contact clicks a tracked GHL Trigger Link'
  ),
  makeGhlNode(
    'ghl_trig_pageview',
    'Events, Forms & Web',
    'trigger',
    'globe',
    'Funnel / Website PageView',
    'trigger: onFunnelPageView',
    'Fires when a known contact views a specific funnel or website step'
  ),
  makeGhlNode(
    'ghl_trig_video_tracking',
    'Events, Forms & Web',
    'trigger',
    'play',
    'Video Tracking',
    'trigger: onVideoWatchPercent',
    'Fires when a lead watches a hosted video up to a defined percentage'
  ),
  makeGhlNode(
    'ghl_trig_inbound_webhook',
    'Events, Forms & Web',
    'trigger',
    'webhook',
    'Inbound Webhook (Premium Trigger)',
    'trigger: onInboundWebhook',
    'Starts a workflow from an external HTTP POST payload (Premium Trigger)'
  ),
  makeGhlNode(
    'ghl_trig_custom_trigger',
    'Events, Forms & Web',
    'trigger',
    'zap',
    'Custom Trigger',
    'trigger: onCustomEvent',
    'Fires from a custom event defined for non-standard/API use cases'
  ),

  // --- Category: Communication & Reputation ---
  makeGhlNode(
    'ghl_trig_call_status',
    'Communication & Reputation',
    'trigger',
    'phone',
    'Call Status',
    'trigger: onCallStatusChanged',
    'Fires on inbound/outbound call status (Completed, Busy, Voicemail, No-Answer)'
  ),
  makeGhlNode(
    'ghl_trig_email_events',
    'Communication & Reputation',
    'trigger',
    'mail',
    'Email Events',
    'trigger: onEmailDeliveryEvent',
    'Fires on email delivery events (Opened, Clicked, Bounced, Unsubscribed, Complained)'
  ),
  makeGhlNode(
    'ghl_trig_number_validation_error',
    'Communication & Reputation',
    'trigger',
    'phone',
    'Number Validation / Twilio Validation Error',
    'trigger: onTwilioValidationError',
    'Fires before sending a call/SMS if lookup flags a landline or invalid number'
  ),
  makeGhlNode(
    'ghl_trig_messaging_error_sms',
    'Communication & Reputation',
    'trigger',
    'message-square',
    'Messaging Error - SMS',
    'trigger: onSmsCarrierError',
    'Fires when an outbound SMS returns a carrier error code'
  ),
  makeGhlNode(
    'ghl_trig_new_review_received',
    'Communication & Reputation',
    'trigger',
    'crm',
    'New Review Received',
    'trigger: onReviewReceived',
    'Fires when a Google or Facebook review arrives'
  ),
  makeGhlNode(
    'ghl_trig_conversation_ai',
    'Communication & Reputation',
    'trigger',
    'bot',
    'Conversation AI Trigger',
    'trigger: onConversationAiEvent',
    'Fires when a configured Conversation AI condition or event occurs'
  ),

  // --- Category: Appointments & Bookings ---
  makeGhlNode(
    'ghl_trig_customer_booked_appointment',
    'Appointments & Bookings',
    'trigger',
    'calendar',
    'Customer Booked Appointment',
    'trigger: onAppointmentBooked',
    'Fires when a lead books via a calendar widget'
  ),
  makeGhlNode(
    'ghl_trig_appointment_status',
    'Appointments & Bookings',
    'trigger',
    'calendar',
    'Appointment Status',
    'trigger: onAppointmentStatusChanged',
    'Fires on any appointment creation or status change (Confirmed, Cancelled, Showed, No-Show, Rescheduled)'
  ),
  makeGhlNode(
    'ghl_trig_service_booking',
    'Appointments & Bookings',
    'trigger',
    'calendar',
    'Service Booking',
    'trigger: onServiceBookingV2',
    'Fires when an appointment is booked via Services (v2)'
  ),
  makeGhlNode(
    'ghl_trig_rental_booking',
    'Appointments & Bookings',
    'trigger',
    'calendar',
    'Rental Booking',
    'trigger: onRentalReservation',
    'Fires when a rental reservation is scheduled'
  ),

  // --- Category: Opportunities & Pipeline ---
  makeGhlNode(
    'ghl_trig_opportunity_created',
    'Opportunities & Pipeline',
    'trigger',
    'crm',
    'Opportunity Created',
    'trigger: onOpportunityCreated',
    'Fires when a new deal is added to any pipeline'
  ),
  makeGhlNode(
    'ghl_trig_opportunity_changed',
    'Opportunities & Pipeline',
    'trigger',
    'crm',
    'Opportunity Changed',
    'trigger: onOpportunityChanged',
    'Fires when selected fields on an opportunity are modified'
  ),
  makeGhlNode(
    'ghl_trig_opportunity_status_changed',
    'Opportunities & Pipeline',
    'trigger',
    'crm',
    'Opportunity Status Changed',
    'trigger: onOpportunityStatusChanged',
    'Fires when status shifts between Open, Won, Lost, or Abandoned'
  ),
  makeGhlNode(
    'ghl_trig_pipeline_stage_changed',
    'Opportunities & Pipeline',
    'trigger',
    'crm',
    'Pipeline Stage Changed',
    'trigger: onPipelineStageChanged',
    'Fires when a deal moves from one stage to another'
  ),
  makeGhlNode(
    'ghl_trig_stale_opportunities',
    'Opportunities & Pipeline',
    'trigger',
    'clock',
    'Stale Opportunities',
    'trigger: onStaleOpportunity',
    'Fires when an opportunity sits untouched in a stage longer than a set duration'
  ),

  // --- Category: Payments, Commerce & Shopify ---
  makeGhlNode(
    'ghl_trig_invoice',
    'Payments, Commerce & Shopify',
    'trigger',
    'stripe',
    'Invoice',
    'trigger: onInvoiceLifecycleEvent',
    'Fires on invoice lifecycle events (Created, Sent, Paid, Partially Paid, Void, Overdue)'
  ),
  makeGhlNode(
    'ghl_trig_payment_received',
    'Payments, Commerce & Shopify',
    'trigger',
    'stripe',
    'Payment Received',
    'trigger: onPaymentReceived',
    'Fires when a one-time or recurring payment succeeds or fails'
  ),
  makeGhlNode(
    'ghl_trig_order_submitted',
    'Payments, Commerce & Shopify',
    'trigger',
    'shopify',
    'Order Form Submission / Order Submitted',
    'trigger: onOrderSubmitted',
    'Fires when a 1-step/2-step order form or ecommerce cart checkout occurs'
  ),
  makeGhlNode(
    'ghl_trig_subscription',
    'Payments, Commerce & Shopify',
    'trigger',
    'stripe',
    'Subscription',
    'trigger: onSubscriptionStatusEvent',
    'Fires when a subscription is created, cancelled, or unpaid'
  ),
  makeGhlNode(
    'ghl_trig_estimates',
    'Payments, Commerce & Shopify',
    'trigger',
    'file-text',
    'Estimates',
    'trigger: onEstimateStatusChanged',
    'Fires when an estimate is sent, accepted, or declined'
  ),
  makeGhlNode(
    'ghl_trig_documents_contracts',
    'Payments, Commerce & Shopify',
    'trigger',
    'file-text',
    'Documents & Contracts',
    'trigger: onContractViewedOrSigned',
    'Fires when a proposal/contract is sent, viewed, signed, or completed'
  ),
  makeGhlNode(
    'ghl_trig_product_viewed_cart',
    'Payments, Commerce & Shopify',
    'trigger',
    'shopify',
    'Product Viewed / Added to Cart',
    'trigger: onStoreCartInteraction',
    'Fires on native e-commerce store browsing behavior'
  ),
  makeGhlNode(
    'ghl_trig_shopify_events',
    'Payments, Commerce & Shopify',
    'trigger',
    'shopify',
    'Shopify (Abandoned Checkout / Order Placed / Order Fulfilled)',
    'trigger: onShopifyEvent',
    'Native triggers for connected Shopify stores'
  ),

  // --- Category: Social & Ad Channels ---
  makeGhlNode(
    'ghl_trig_fb_ig_comment',
    'Social & Ad Channels',
    'trigger',
    'message-square',
    'Facebook / Instagram – Comment(s) On A Post',
    'trigger: onSocialPostComment',
    'Fires when a user comments on a selected post (used for DM comment-growth automation)'
  ),
  makeGhlNode(
    'ghl_trig_ad_lead_form',
    'Social & Ad Channels',
    'trigger',
    'file-text',
    'Facebook / TikTok / LinkedIn Lead Form Submitted',
    'trigger: onAdLeadFormSubmitted',
    'Fires when a native lead ad form is submitted on those platforms'
  ),
  makeGhlNode(
    'ghl_trig_click_to_whatsapp_ads',
    'Social & Ad Channels',
    'trigger',
    'phone',
    'Click To WhatsApp Ads',
    'trigger: onClickToWhatsAppAd',
    'Fires when an inbound WhatsApp thread originates from a Meta Click-to-WhatsApp ad'
  ),

  // --- Category: Memberships, Courses & Communities ---
  makeGhlNode(
    'ghl_trig_courses_membership',
    'Memberships, Courses & Communities',
    'trigger',
    'layers',
    'Courses / Membership',
    'trigger: onMembershipLessonOrAccess',
    'Membership New Signup, Category Completed, Lesson Completed, Product Completed, Offer Access Granted/Removed, User Login'
  ),
  makeGhlNode(
    'ghl_trig_communities',
    'Memberships, Courses & Communities',
    'trigger',
    'layers',
    'Communities',
    'trigger: onCommunityAccessOrPost',
    'Group Access Granted/Revoked, Private Channel Access Granted/Revoked, Community Posts, Comments, and Level Ups'
  ),
  makeGhlNode(
    'ghl_trig_certificate_issued',
    'Memberships, Courses & Communities',
    'trigger',
    'file-text',
    'Certificates: Certificate Issued',
    'trigger: onCertificateIssued',
    'Fires when a course completion certificate is generated'
  ),

  // --- Category: Affiliates & IVR ---
  makeGhlNode(
    'ghl_trig_affiliate_manager',
    'Affiliates & IVR',
    'trigger',
    'briefcase',
    'Affiliate Manager',
    'trigger: onAffiliateEvent',
    'Affiliate Created, New Affiliate Sales, Affiliate Enrolled In Campaign, Lead Created (Affiliate)'
  ),
  makeGhlNode(
    'ghl_trig_start_ivr',
    'Affiliates & IVR',
    'trigger',
    'phone',
    'IVR: Start IVR Trigger',
    'trigger: onStartIvrCall',
    'Initiates a phone tree routing workflow when an inbound call hits a configured number'
  ),
];

// ============================================================================
// 2. GHL BUILT-IN WORKFLOW ACTIONS (EXECUTION & LOGIC NODES)
// ============================================================================
export const GHL_BUILTIN_ACTIONS: LibraryNodeTemplate[] = [
  // --- Category: Flow Control & Internal Tools (Logic Nodes) ---
  makeGhlNode(
    'ghl_act_if_else',
    'Flow Control & Internal Tools',
    'router',
    'split',
    'If / Else (Conditional Branching)',
    'router: ifTrueOrFalse',
    'Evaluates criteria (contact fields, tags, custom values, date/time, opportunity status) and splits into multiple conditional branches plus fallback None branch'
  ),
  makeGhlNode(
    'ghl_act_wait',
    'Flow Control & Internal Tools',
    'router',
    'clock',
    'Wait / Delay',
    'router: waitDurationOrCondition',
    'Pauses execution for a set time delay, until specific date/time, appointment time, or until condition is met (Wait for Contact Reply, Link Click)'
  ),
  makeGhlNode(
    'ghl_act_split_random',
    'Flow Control & Internal Tools',
    'router',
    'git-branch',
    'Split (Random Distribution)',
    'router: randomDistribution',
    'Divides traffic across up to 5 paths by percentage weight (must total 100%). Contacts remain locked into their assigned path if they re-enter'
  ),
  makeGhlNode(
    'ghl_act_ab_test',
    'Flow Control & Internal Tools',
    'router',
    'git-branch',
    'A/B Test',
    'router: abTestWinningCriteria',
    'Splits contacts across 2–10 paths and automatically evaluates Winning Criteria (Goal Event or Custom Condition) over set sample size or duration'
  ),
  makeGhlNode(
    'ghl_act_goal_event',
    'Flow Control & Internal Tools',
    'router',
    'zap',
    'Goal Event',
    'router: jumpToGoal',
    'Monitors contacts anywhere upstream; as soon as criteria is met (booked, paid, tagged), skips intermediate steps and jumps directly to Goal node'
  ),
  makeGhlNode(
    'ghl_act_go_to',
    'Flow Control & Internal Tools',
    'router',
    'loop',
    'Go To',
    'router: goToStep',
    'Connects one node or branch end to another step inside the same workflow (useful for merging branches or creating controlled loops)'
  ),
  makeGhlNode(
    'ghl_act_drip_mode',
    'Flow Control & Internal Tools',
    'action',
    'sliders',
    'Drip Mode',
    'action: batchDripThrottling',
    'Batches contacts passing through (e.g., X contacts every Y minutes/hours/days) to protect email/SMS deliverability and prevent server overload'
  ),
  makeGhlNode(
    'ghl_act_add_remove_workflow',
    'Flow Control & Internal Tools',
    'action',
    'play',
    'Add to Workflow / Remove from Workflow',
    'action: workflowEnrollment',
    'Pushes a contact into another workflow or pulls them out of the current, specific, or all workflows'
  ),
  makeGhlNode(
    'ghl_act_set_event_start_date',
    'Flow Control & Internal Tools',
    'action',
    'calendar',
    'Set Event Start Date',
    'action: setDynamicEventTimestamp',
    'Sets a dynamic reference timestamp (used alongside Wait steps set to Event/Appointment Time for webinars, cohorts, or launches)'
  ),
  makeGhlNode(
    'ghl_act_math_operation',
    'Flow Control & Internal Tools',
    'action',
    'code',
    'Math Operation',
    'action: mathCalculations',
    'Performs addition, subtraction, multiplication, or division on numeric/monetary fields, or adds/subtracts days from date fields'
  ),
  makeGhlNode(
    'ghl_act_datetime_formatter',
    'Flow Control & Internal Tools',
    'action',
    'calendar',
    'Date / Time Formatter (Premium Action)',
    'action: formatDateTimeTimezone',
    'Converts date formats, compares dates, or adjusts timezones'
  ),
  makeGhlNode(
    'ghl_act_text_formatter',
    'Flow Control & Internal Tools',
    'action',
    'file-text',
    'Text Formatter (Premium Action)',
    'action: stringManipulation',
    'Manipulates strings: upper/lowercase, title case, split text, find & replace, trim whitespace, extract email/URL, or check length'
  ),
  makeGhlNode(
    'ghl_act_number_formatter',
    'Flow Control & Internal Tools',
    'action',
    'code',
    'Number Formatter (Premium Action)',
    'action: formatNumberCurrency',
    'Formats strings into currencies, phone numbers, or rounded decimals'
  ),
  makeGhlNode(
    'ghl_act_array_functions',
    'Flow Control & Internal Tools',
    'action',
    'code',
    'Array Functions (Premium Action)',
    'action: listArrayOperations',
    'Handles list-based JSON/webhook data (Find, Filter, Line Items, Math on arrays)'
  ),
  makeGhlNode(
    'ghl_act_custom_code',
    'Flow Control & Internal Tools',
    'action',
    'code',
    'Custom Code (Premium Action)',
    'action: runNodeOrPython',
    'Runs custom Node.js (JavaScript) or Python scripts with HTTP request support and returns key-value outputs to downstream nodes'
  ),
  makeGhlNode(
    'ghl_act_webhook',
    'Flow Control & Internal Tools',
    'action',
    'webhook',
    'Webhook / Custom Webhook',
    'action: outboundHttpRequest',
    'Sends an outbound HTTP request (POST, GET, PUT, DELETE) with custom headers and payloads to external endpoints'
  ),

  // --- Category: Contact & CRM Management Nodes ---
  makeGhlNode(
    'ghl_act_create_find_contact',
    'Contact & CRM Management',
    'action',
    'crm',
    'Create Contact / Find Contact',
    'action: createOrLookupContact',
    'Creates a new contact record or looks up an existing contact by matching field values'
  ),
  makeGhlNode(
    'ghl_act_update_contact_field',
    'Contact & CRM Management',
    'action',
    'crm',
    'Update Contact Field',
    'action: modifyContactFields',
    'Modifies standard or custom fields on a contact record (or clears field data)'
  ),
  makeGhlNode(
    'ghl_act_add_remove_tag',
    'Contact & CRM Management',
    'action',
    'crm',
    'Add Contact Tag / Remove Contact Tag',
    'action: tagManagement',
    'Applies or strips tags for segmentation and chaining workflows'
  ),
  makeGhlNode(
    'ghl_act_assign_user_round_robin',
    'Contact & CRM Management',
    'action',
    'crm',
    'Assign to User / Remove Assigned User',
    'action: userAssignmentRoundRobin',
    'Assigns contact to single staff member or distributes leads across multiple users via Round Robin (weighted or equal distribution)'
  ),
  makeGhlNode(
    'ghl_act_contact_follower',
    'Contact & CRM Management',
    'action',
    'crm',
    'Add / Remove Contact Follower',
    'action: contactFollowers',
    'Adds or removes secondary team members who need visibility on the contact'
  ),
  makeGhlNode(
    'ghl_act_toggle_dnd',
    'Contact & CRM Management',
    'action',
    'crm',
    'Enable / Disable DND',
    'action: toggleDndChannels',
    'Toggles Do Not Disturb on or off for all channels or specific channels (SMS, Email, Call, WhatsApp, FB)'
  ),
  makeGhlNode(
    'ghl_act_add_to_notes',
    'Contact & CRM Management',
    'action',
    'file-text',
    'Add to Notes',
    'action: appendContactNote',
    'Appends an internal note with dynamic custom values to the contact timeline'
  ),
  makeGhlNode(
    'ghl_act_add_task',
    'Contact & CRM Management',
    'action',
    'tasks',
    'Add Task',
    'action: createFollowupTask',
    'Creates a follow-up task assigned to a user (supports contact-less tasks when paired with Inbound Webhooks)'
  ),
  makeGhlNode(
    'ghl_act_copy_contact',
    'Contact & CRM Management',
    'action',
    'crm',
    'Copy Contact',
    'action: cloneContactToLocation',
    'Clones the contact record into another sub-account (location) within your agency'
  ),
  makeGhlNode(
    'ghl_act_delete_contact',
    'Contact & CRM Management',
    'action',
    'crm',
    'Delete Contact',
    'action: deleteContactRecord',
    'Permanently deletes the contact from the CRM'
  ),
  makeGhlNode(
    'ghl_act_modify_engagement_score',
    'Contact & CRM Management',
    'action',
    'crm',
    'Modify Contact Engagement Score',
    'action: updateLeadScorePoints',
    'Adds or subtracts points from a contact lead score'
  ),
  makeGhlNode(
    'ghl_act_update_custom_value',
    'Contact & CRM Management',
    'action',
    'crm',
    'Update Custom Value',
    'action: updateLocationCustomValue',
    'Dynamically updates a global sub-account Custom Value ({{custom_values.key}})'
  ),
  makeGhlNode(
    'ghl_act_manage_associated_records',
    'Contact & CRM Management',
    'action',
    'database',
    'Manage Associated Records',
    'action: linkCustomObjectsOrCompanies',
    'Associates/links Contacts with Custom Objects or Company records'
  ),

  // --- Category: Communication Nodes ---
  makeGhlNode(
    'ghl_act_send_email',
    'Communication',
    'action',
    'mail',
    'Send Email',
    'action: sendAutomatedEmail',
    'Sends an automated HTML or plain-text email'
  ),
  makeGhlNode(
    'ghl_act_send_sms',
    'Communication',
    'action',
    'message-square',
    'Send SMS',
    'action: sendAutomatedSms',
    'Sends an automated text message'
  ),
  makeGhlNode(
    'ghl_act_call_whisper',
    'Communication',
    'action',
    'phone',
    'Call',
    'action: bridgeCallWithWhisper',
    'Calls assigned user first, plays whisper message (New lead from Facebook, press 1 to connect), and bridges call to lead'
  ),
  makeGhlNode(
    'ghl_act_voicemail_drop',
    'Communication',
    'action',
    'phone',
    'Voicemail (Voicemail Drop)',
    'action: ringlessVoicemailDrop',
    'Sends a pre-recorded .mp3/.wav audio file directly to the contact voicemail inbox (ringless voicemail)'
  ),
  makeGhlNode(
    'ghl_act_social_dm',
    'Communication',
    'action',
    'message-square',
    'Messenger / Instagram DM / GMB Messaging',
    'action: sendSocialDirectMessage',
    'Sends automated reply on Facebook Messenger, Instagram Direct, or Google Business Profile chat within 24-hour window'
  ),
  makeGhlNode(
    'ghl_act_whatsapp_message',
    'Communication',
    'action',
    'phone',
    'WhatsApp / WhatsApp Media / WhatsApp Interactive',
    'action: sendWhatsAppTemplate',
    'Sends approved WhatsApp templates, media files, or interactive reply-button messages'
  ),
  makeGhlNode(
    'ghl_act_send_live_chat',
    'Communication',
    'action',
    'message-square',
    'Send Live Chat Message',
    'action: replyWebChatWidget',
    'Replies directly inside a website Live Chat widget conversation'
  ),
  makeGhlNode(
    'ghl_act_send_internal_notification',
    'Communication',
    'action',
    'mail',
    'Send Internal Notification',
    'action: notifyTeamChannels',
    'Alerts team members via In-App Notification, Email, SMS, or WhatsApp'
  ),
  makeGhlNode(
    'ghl_act_manual_call_sms',
    'Communication',
    'action',
    'phone',
    'Manual Action (Manual Call / Manual SMS)',
    'action: queueManualSalesAction',
    'Places contact into power-dialer/task queue (Conversations > Manual Actions) for a sales rep to step through'
  ),
  makeGhlNode(
    'ghl_act_edit_conversation',
    'Communication',
    'action',
    'message-square',
    'Edit Conversation',
    'action: setConversationStatus',
    'Marks the contact inbox thread as Read/Unread or Moves it between Recents and Archived'
  ),
  makeGhlNode(
    'ghl_act_send_review_request',
    'Communication',
    'action',
    'crm',
    'Send Review Request',
    'action: requestReputationReview',
    'Sends a trackable reputation management review invite via SMS or Email'
  ),

  // --- Category: Appointments, Pipelines & Payments Nodes ---
  makeGhlNode(
    'ghl_act_update_appointment_status',
    'Appointments, Pipelines & Payments',
    'action',
    'calendar',
    'Update Appointment Status',
    'action: changeAppointmentStatus',
    'Changes the status of triggering appointment (Confirmed, Cancelled, Rescheduled, No-Show, Showed)'
  ),
  makeGhlNode(
    'ghl_act_generate_booking_link',
    'Appointments, Pipelines & Payments',
    'action',
    'calendar',
    'Generate One-Time Booking Link',
    'action: createSingleUseBookingLink',
    'Creates a single-use calendar scheduling link ({{appointment.one_time_link}}) that expires once booked'
  ),
  makeGhlNode(
    'ghl_act_create_update_opportunity',
    'Appointments, Pipelines & Payments',
    'action',
    'crm',
    'Create / Update Opportunity',
    'action: upsertDealPipelineStage',
    'Creates a new deal card in pipeline or updates existing opportunity stage, status, value, or name'
  ),
  makeGhlNode(
    'ghl_act_remove_opportunity',
    'Appointments, Pipelines & Payments',
    'action',
    'crm',
    'Remove Opportunity',
    'action: deletePipelineOpportunity',
    'Deletes an opportunity from a pipeline'
  ),
  makeGhlNode(
    'ghl_act_find_opportunity',
    'Appointments, Pipelines & Payments',
    'action',
    'crm',
    'Find Opportunity',
    'action: lookupOpportunityByField',
    'Locates a specific opportunity record to update downstream'
  ),
  makeGhlNode(
    'ghl_act_stripe_charge',
    'Appointments, Pipelines & Payments',
    'action',
    'stripe',
    'Stripe One-Time Charge',
    'action: processStripeCustomerCharge',
    'Charges a saved customer payment method on file via Stripe'
  ),
  makeGhlNode(
    'ghl_act_send_invoice',
    'Appointments, Pipelines & Payments',
    'action',
    'stripe',
    'Send Invoice',
    'action: dispatchBillingInvoice',
    'Automatically generates and sends an invoice from a saved template'
  ),
  makeGhlNode(
    'ghl_act_send_estimate',
    'Appointments, Pipelines & Payments',
    'action',
    'stripe',
    'Send Estimate',
    'action: dispatchQuoteEstimate',
    'Sends a quote/estimate template to the contact'
  ),
  makeGhlNode(
    'ghl_act_send_documents_contracts',
    'Appointments, Pipelines & Payments',
    'action',
    'file-text',
    'Send Documents & Contracts',
    'action: sendContractForEsign',
    'Sends a contract or proposal template for e-signature'
  ),
  makeGhlNode(
    'ghl_act_send_recurring_invoice',
    'Appointments, Pipelines & Payments',
    'action',
    'stripe',
    'Send Recurring Invoice',
    'action: enrollRecurringInvoiceTemplate',
    'Enrolls a contact in a scheduled recurring invoice template'
  ),

  // --- Category: Workflow AI & AI Employee Nodes ---
  makeGhlNode(
    'ghl_act_ai_agent',
    'Workflow AI & AI Employee',
    'ai',
    'bot',
    'AI Agent (Workflow AI)',
    'ai: autonomousWorkflowAgent',
    'Multi-step autonomous agent node that uses instructions, memory, and assigned tools (Knowledge Base, CRM updates) to return structured JSON or update CRM'
  ),
  makeGhlNode(
    'ghl_act_custom_prompt_gpt',
    'Workflow AI & AI Employee',
    'ai',
    'sparkles',
    'Custom Prompt (GPT Powered by OpenAI)',
    'ai: customLlmPrompt',
    'Sends custom prompt with CRM variables to an LLM and stores response for downstream nodes'
  ),
  makeGhlNode(
    'ghl_act_ai_summarize',
    'Workflow AI & AI Employee',
    'ai',
    'sparkles',
    'AI Summarize',
    'ai: summarizeTranscriptsOrEmails',
    'Summarizes long inbound emails, transcripts, or form messages into concise notes'
  ),
  makeGhlNode(
    'ghl_act_ai_intent_detection',
    'Workflow AI & AI Employee',
    'ai',
    'cpu',
    'AI Intent Detection / Categorize',
    'ai: classifyInboundIntent',
    'Classifies free-text messages into predefined categories (Billing, Urgent Repair, Spam) for If/Else routing'
  ),
  makeGhlNode(
    'ghl_act_ai_translate_sentiment',
    'Workflow AI & AI Employee',
    'ai',
    'sparkles',
    'AI Translate / AI Sentiment Analysis',
    'ai: translateAndScoreSentiment',
    'Translates text between languages or scores customer sentiment (Positive, Neutral, Negative)'
  ),
  makeGhlNode(
    'ghl_act_ai_extract_data',
    'Workflow AI & AI Employee',
    'ai',
    'sparkles',
    'AI Extract Data',
    'ai: extractEntitiesToFields',
    'Pulls structured entities (addresses, dates, budgets) out of unstructured text'
  ),
  makeGhlNode(
    'ghl_act_conversation_ai',
    'Workflow AI & AI Employee',
    'ai',
    'bot',
    'Conversation AI',
    'ai: twoWayChatBot',
    'Engages contact in two-way automated chat over SMS/Social/Webchat to answer questions or book calendar appointments'
  ),
  makeGhlNode(
    'ghl_act_voice_ai',
    'Workflow AI & AI Employee',
    'ai',
    'phone',
    'Voice AI (Place Outbound Call)',
    'ai: conversationalVoiceAgent',
    'Triggers a Voice AI agent to dial the contact, hold spoken conversation, qualify them, and update CRM fields'
  ),

  // --- Category: Marketing, Courses, Communities, Affiliates & IVR Nodes ---
  makeGhlNode(
    'ghl_act_fb_capi',
    'Marketing, Courses, Communities, Affiliates & IVR',
    'action',
    'globe',
    'Facebook – Conversion API (CAPI)',
    'action: metaConversionApi',
    'Sends server-side conversion events back to Meta Ads Manager'
  ),
  makeGhlNode(
    'ghl_act_fb_custom_audience',
    'Marketing, Courses, Communities, Affiliates & IVR',
    'action',
    'globe',
    'Facebook – Add / Remove from Custom Audience',
    'action: syncMetaCustomAudience',
    'Syncs leads with Meta Custom Audiences'
  ),
  makeGhlNode(
    'ghl_act_google_ads_conversion',
    'Marketing, Courses, Communities, Affiliates & IVR',
    'action',
    'globe',
    'Add to Google Ads',
    'action: googleAdsOfflineConversion',
    'Fires an offline conversion event to a linked Google Ads account'
  ),
  makeGhlNode(
    'ghl_act_google_analytics',
    'Marketing, Courses, Communities, Affiliates & IVR',
    'action',
    'globe',
    'Add to Google Analytics',
    'action: ga4MeasurementProtocol',
    'Fires a tracking event to GA4'
  ),
  makeGhlNode(
    'ghl_act_courses_access',
    'Marketing, Courses, Communities, Affiliates & IVR',
    'action',
    'layers',
    'Courses & Memberships: Grant / Revoke Offer Access',
    'action: membershipOfferAccess',
    'Grant Offer Access or Revoke Offer Access for contact'
  ),
  makeGhlNode(
    'ghl_act_communities_access',
    'Marketing, Courses, Communities, Affiliates & IVR',
    'action',
    'layers',
    'Communities: Grant / Revoke Access',
    'action: communityGroupAccess',
    'Grant Group Access, Revoke Group Access, Grant Private Channel Access, Revoke Private Channel Access'
  ),
  makeGhlNode(
    'ghl_act_issue_certificate',
    'Marketing, Courses, Communities, Affiliates & IVR',
    'action',
    'file-text',
    'Certificates: Issue Certificate',
    'action: generateCompletionCertificate',
    'Sends a personalized course completion certificate'
  ),
  makeGhlNode(
    'ghl_act_affiliate_manager',
    'Marketing, Courses, Communities, Affiliates & IVR',
    'action',
    'briefcase',
    'Affiliate Manager: Add / Update / Record Sales',
    'action: affiliateManagement',
    'Add to Affiliate Manager, Update Affiliate (Active/Inactive), Add/Remove Leads Under an Affiliate, Add Manual Sales For An Affiliate'
  ),
  makeGhlNode(
    'ghl_act_ivr_actions',
    'Marketing, Courses, Communities, Affiliates & IVR',
    'action',
    'phone',
    'IVR (Interactive Voice Response) Actions',
    'action: ivrPhoneTreeRouting',
    'Used when paired with Start IVR Trigger: Gather Input on Call (DTMF/voice), Play Message, Connect Call, Record Voicemail, End IVR Call'
  ),

  // --- Category: Native App Integrations ---
  makeGhlNode(
    'ghl_act_native_sheets',
    'Native App Integrations',
    'action',
    'sheet',
    'Native Google Sheets Integration',
    'action: googleSheetsRowSync',
    'Create, Update, Lookup, or Delete Row directly in Google Sheets from GHL'
  ),
  makeGhlNode(
    'ghl_act_native_slack',
    'Native App Integrations',
    'action',
    'message-square',
    'Native Slack Integration',
    'action: postSlackChannelOrDm',
    'Send Direct or Channel Message into team Slack workspace'
  ),
  makeGhlNode(
    'ghl_act_native_productivity',
    'Native App Integrations',
    'action',
    'tasks',
    'Native ClickUp / Notion / Airtable / Monday.com',
    'action: syncProjectManagementTask',
    'Create or update task items in ClickUp, Notion, Airtable, or Monday.com'
  ),
];

export const GHL_FULL_INTEGRATIONS_CATALOG: LibraryNodeTemplate[] = [
  ...GHL_BUILTIN_TRIGGERS,
  ...GHL_BUILTIN_ACTIONS,
];
