import {flow} from './flow.js';
import {finance,cleanScenario} from './scenario.js';

/** Compare the same initial decisions at three moments. This is a scenario comparison,
 * not an event log: no physical inventory carry-over or supplier rescheduling is assumed. */
export function demandJourney(decisions={},actions={},rawScenario={}){
 const s=cleanScenario(rawScenario);
 const planned={...s,actualDemand:s.demand,lockUpstream:false};
 const actual={...s,lockUpstream:true};
 const plan=flow(decisions,{},planned);
 const surprise=flow(decisions,{},actual);
 const recovered=flow(decisions,actions,actual);
 const fp=finance(plan,planned),fs=finance(surprise,actual),fr=finance(recovered,actual);
 const fulfillment=r=>r.demand>0?100*r.dispatched/r.demand:0;
 return {
  plan:{demand:plan.demand,dispatched:plan.dispatched,pending:plan.pending,fulfillment:fulfillment(plan),margin:fp.margin,expenses:fp.operationalExpenses},
  surprise:{demand:surprise.demand,dispatched:surprise.dispatched,pending:surprise.pending,fulfillment:fulfillment(surprise),margin:fs.margin,expenses:fs.operationalExpenses},
  recovery:{demand:recovered.demand,dispatched:recovered.dispatched,pending:recovered.pending,fulfillment:fulfillment(recovered),margin:fr.margin,expenses:fr.operationalExpenses},
  impact:{demandChange:surprise.demand-plan.demand,servicePoints:fulfillment(surprise)-fulfillment(plan),marginChange:fs.margin-fp.margin},
  recoveryImpact:{dispatched:recovered.dispatched-surprise.dispatched,servicePoints:fulfillment(recovered)-fulfillment(surprise),marginChange:fr.margin-fs.margin,expenseChange:fr.operationalExpenses-fs.operationalExpenses}
 };
}
