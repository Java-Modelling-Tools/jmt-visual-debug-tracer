/**
 * Workload class description from JMT metadata Line 1
 */
export interface JobClassInfo {
	id: number;
	name: string;
	type: 'OPEN' | 'CLOSED' | string;
	priority: number;
	referenceNode?: string;
}

/**
 * Internal section descriptions for a NetNode
 */
export interface NodeSectionInput {
	type: string;
	capacity?: number; // -1 for infinite
}

export interface NodeSectionService {
	type: string;
	servers?: number;
}

export interface NodeSectionOutput {
	type: string;
}

export interface NodeSections {
	input?: NodeSectionInput;
	service?: NodeSectionService;
	output?: NodeSectionOutput;
}

/**
 * Station / Node topology from JMT metadata Line 1
 */
export interface NodeTopology {
	id: number;
	name: string;
	nodeType: 'Source' | 'Queue' | 'Server' | 'Delay' | 'Fork' | 'Join' | 'Sink' | 'Station' | string;
	sections?: NodeSections;
	x?: number;
	y?: number;
}

/**
 * Directed connection (wire) between stations
 */
export interface ConnectionTopology {
	source: string;
	target: string;
}

/**
 * Line 1 Metadata record emitted by SimEventTracer
 */
export interface TraceMetadata {
	type: 'metadata';
	version: string;
	timestamp: number;
	modelName: string;
	classes: JobClassInfo[];
	nodes: NodeTopology[];
	connections: ConnectionTopology[];
}

/**
 * Simulation Event record emitted by SimEventTracer
 */
export interface TraceEvent {
	type: 'event';
	seq: number;
	t: number;
	phase: 'SEND' | 'DISPATCH' | 'DROP' | 'NOT_PROCESSED' | string;
	event: string;
	eventId: number;
	delay?: number;
	schedTime?: number;

	// Station & Section routing
	srcStation: string;
	srcStationId?: number;
	srcSection?: 'INPUT' | 'SERVICE' | 'OUTPUT' | 'NO_ADDRESS' | string;
	srcClass?: string;
	srcDisplay?: string;

	dstStation: string;
	dstStationId?: number;
	dstSection?: 'INPUT' | 'SERVICE' | 'OUTPUT' | 'NO_ADDRESS' | string;
	dstClass?: string;
	dstDisplay?: string;

	src: string;
	dst: string;

	// Exact origin in Java source code
	caller?: string;

	// Station state variables
	nodeJobs?: number;
	queueSize?: number;
	queueCap?: number;
	servers?: number;

	// Job / Packet variables
	jobId?: number;
	jobClass?: string;
	classId?: number;
	priority?: number;
	enterTime?: number;
	serviceTime?: number;
	queueTime?: number;
	isToken?: boolean;
	lastVisited?: string;

	// Payload & debug messages
	payloadType?: string;
	payload?: string;
	msg?: string;
}

/**
 * Summary Footer record emitted at simulation completion
 */
export interface TraceFooter {
	type: 'footer';
	totalEvents: number;
	droppedEvents: number;
	lastSimTime: number;
	durationMs: number;
	part?: number;
}

export type TraceRecord = TraceMetadata | TraceEvent | TraceFooter;

/**
 * In-flight packet animated on canvas
 */
export interface ActivePacket {
	id: string; // unique animation instance key
	jobId: number;
	jobClass: string;
	priority: number;
	srcStation: string;
	dstStation: string;
	srcSection?: string;
	dstSection?: string;
	phase: string;
	startTime: number;
	schedTime: number;
	event: string;
	progress: number; // 0.0 to 1.0 along the connection wire
	status: 'flying' | 'delivered' | 'dropped';
}

/**
 * Server unit status inside a station
 */
export interface ServerSlotState {
	id: number;
	busy: boolean;
	jobId?: number;
	jobClass?: string;
	startSimTime?: number;
}

/**
 * Queued job representation inside a station's input section
 */
export interface QueuedJob {
	jobId: number;
	jobClass: string;
	priority: number;
	enterTime?: number;
}

/**
 * Detailed real-time snapshot of a job currently residing in the model
 */
export interface ActiveModelJob {
	jobId: number;
	jobClass: string;
	priority: number;
	state: 'IN_SERVICE' | 'IN_QUEUE' | 'IN_FLIGHT';
	stationName?: string;
	serverIndex?: number;
	queuePosition?: number;
	linkSource?: string;
	linkTarget?: string;
	progressPercent?: number; // 0 - 100 for flying packets
	enterTime?: number;
	residenceTime: number; // currentSimTime - enterTime
	serviceStartTime?: number;
	scheduledDeparture?: number;
	lastEventSeq?: number;
	lastEventPhase?: string;
	packetRef?: ActivePacket;
}

/**
 * Live calculated state of a station at the current point in simulation time
 */
export interface StationLiveState {
	id: number;
	name: string;
	nodeType: string;
	capacity: number;
	totalServers: number;
	queueJobs: QueuedJob[];
	servers: ServerSlotState[];
	currentQueueSize: number;
	nodeJobs: number;
	droppedCount: number;
	completedCount: number;
	recentEvents: TraceEvent[];
}

/**
 * Breakpoint condition for pausing simulation playback
 */
export interface BreakpointConfig {
	id: string;
	enabled: boolean;
	type: 'drop' | 'job_id' | 'queue_capacity' | 'station_event';
	label: string;
	jobIdTarget?: number;
	stationTarget?: string;
	queueThresholdPercent?: number;
}

/**
 * Point in 2D coordinate space
 */
export interface Point2D {
	x: number;
	y: number;
}

/**
 * Rendered station position and dimensions on canvas
 */
export interface NodeLayout {
	id: number;
	name: string;
	nodeType: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Computed connection wire path
 */
export interface ConnectionPath {
	source: string;
	target: string;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	controlX1: number;
	controlY1: number;
	controlX2: number;
	controlY2: number;
	pathData: string;
}
