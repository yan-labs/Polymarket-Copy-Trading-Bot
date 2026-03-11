# WebSocket Improvement Opportunity

**Date**: 2026-03-12
**Status**: Research Complete - Ready for Implementation

## Current State

The bot currently uses REST API polling to detect trades:
- Polls `https://data-api.polymarket.com/activity?user=<address>&type=TRADE`
- Default interval: 1 second (`FETCH_INTERVAL = 1`)
- Works reliably but has inherent latency

## Opportunity

Polymarket provides a WebSocket endpoint for real-time data:
```
wss://ws-subscriptions-clob.polymarket.com/ws
```

This endpoint is already configured in `.env.example` as `CLOB_WS_URL` but is NOT currently used for trade detection.

## Benefits of WebSocket

1. **Lower Latency** - Real-time trade detection instead of polling
2. **More Efficient** - No unnecessary API calls
3. **Competitive Advantage** - MirrorCopy claims 50-300ms latency via WebSocket
4. **Better UX** - Users get faster trade execution

## Implementation Plan

### Phase 1: Research WebSocket API
- [ ] Connect to WebSocket endpoint
- [ ] Understand message format
- [ ] Identify subscription channels for trade events
- [ ] Test with sample trader addresses

### Phase 2: Implement WebSocket Client
- [ ] Create `src/services/webSocketClient.ts`
- [ ] Handle connection, reconnection, errors
- [ ] Subscribe to trader activity channels
- [ ] Parse and forward trade events

### Phase 3: Integrate with Trade Monitor
- [ ] Update `tradeMonitor-multiuser.ts` to use WebSocket
- [ ] Keep REST polling as fallback
- [ ] Handle graceful degradation

### Phase 4: Testing & Optimization
- [ ] Test with multiple traders
- [ ] Measure latency improvement
- [ ] Optimize reconnection logic
- [ ] Document new configuration options

## Estimated Effort

- Research: 2-4 hours
- Implementation: 4-8 hours
- Testing: 2-4 hours
- **Total: 8-16 hours**

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket API changes | Medium | Keep REST as fallback |
| Connection stability | Medium | Implement robust reconnection |
| Rate limits | Low | WebSocket should have fewer limits |
| Missing documentation | Medium | Test thoroughly, document findings |

## Recommendation

**Priority: Medium**

The current REST polling with 1-second interval is adequate for launch. WebSocket should be implemented post-launch as an optimization to improve latency and reduce API load.

## Next Steps

1. Deploy current version first
2. Gather user feedback
3. If latency complaints arise, prioritize WebSocket
4. Otherwise, implement as part of v2.0 improvements

---

*Document created by poly-copybot agent during cron loop analysis.*