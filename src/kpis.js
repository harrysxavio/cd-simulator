// Indicadores pedagógicos calculados con unidades agregadas de una jornada.
// No simular OTIF, precisión física de inventario, defectos o productividad horaria sin datos.
export function areaKpis(r,s){
 const pct=(a,b)=>b>0?(100*a/b).toFixed(1)+' %':'N/D';
 const ratio=(a,b,unit=' unid./operario')=>b>0?(a/b).toFixed(1)+unit:'N/D';
 const entry=(label,value,formula,meaning,scope='Calculado')=>({label,value,formula,meaning,scope});
 const planningGap=Math.max(0,r.estimated-r.stock);
 const planned=r.plannedDemand||r.demand;
 const releaseBase=r.stock+r.released;
 const forecastBias=r.demand>0?(100*(r.estimated-r.demand)/r.demand).toFixed(1):'N/D';
 return {
 commercial:[
 entry('Error absoluto de pronóstico',pct(Math.abs(r.estimated-r.demand),r.demand),'|Pronóstico − demanda real| / demanda real × 100','Cuanto menor, mejor. Es un error de una sola campaña, no WAPE histórico.'),
 entry('Sesgo de pronóstico',forecastBias==='N/D'?'N/D':forecastBias+' %','(Pronóstico − demanda real) / demanda real × 100','Positivo: sobreestimación y riesgo de exceso. Negativo: subestimación y riesgo de quiebre.'),
 entry('Variación de demanda real vs. plan',((r.demand/planned-1)*100).toFixed(1)+' %','(Demanda real / demanda prevista base − 1) × 100','Identifica shocks de demanda; no es error de ejecución del equipo comercial por sí solo.')
 ],
 planning:[
 entry('Cobertura de compra planificada',pct(r.ordered,planningGap),'Unidades solicitadas / brecha prevista tras stock inicial × 100','Mide la decisión de reposición. No equivale a cobertura de días. Si no hay brecha, se muestra N/D.'),
 entry('Cobertura de demanda real con plan',pct(Math.min(r.demand,r.stock+r.ordered),r.demand),'Mínimo(demanda real, stock inicial + compra solicitada) / demanda real × 100','Es cobertura teórica antes de entrega, recepción y calidad; no garantiza disponibilidad física.'),
 entry('Desviación del plan de abastecimiento',Math.max(0,r.demand-r.stock-r.ordered).toLocaleString('es-CL')+' unid.','Máximo(0, demanda real − stock inicial − compra solicitada)','Brecha teórica de unidades si la demanda supera el abastecimiento planificado.')
 ],
 purchasing:[
 entry('Cumplimiento de proveedor al corte',pct(r.delivered,r.ordered),'Unidades entregadas al corte / unidades solicitadas × 100','Cumplimiento en cantidad dentro de la jornada. Puede variar ligeramente por redondeo de unidades; no mide OTIF por pedido.'),
 entry('Brecha de entrega de proveedor',Math.max(0,r.ordered-r.delivered).toLocaleString('es-CL')+' unid.','Máximo(0, unidades solicitadas − unidades entregadas)','Unidades faltantes del proveedor antes de la recepción. No atribuirlas a capacidad del CD.'),
 entry('Abastecimiento recibido vs. demanda',pct(r.delivered,r.demand),'Unidades entregadas por proveedor / demanda real × 100','Mide escala de compra frente a demanda; no incluye stock inicial ni mide nivel de servicio.')
 ],
 receiving:[
 entry('Productividad de recepción',ratio(r.received,s.receivingOperators),'Unidades recibidas / operarios asignados en la jornada','Productividad observada por persona-jornada, no unidades por hora. Depende del abastecimiento.'),
 entry('Utilización de capacidad de recepción',pct(r.received,r.receivingCapacity),'Unidades ingresadas / capacidad de recepción configurada × 100','Una utilización baja puede explicarse por entregas insuficientes.')
 ],
 quality:[
 entry('Tasa de liberación en jornada',pct(r.released,r.received),'Unidades liberadas / unidades recibidas × 100','Mide disponibilidad tras controles en el corte, no conformidad o tasa de defectos.'),
 entry('Pendientes de liberación',Math.max(0,r.received-r.released).toLocaleString('es-CL')+' unid.','Unidades recibidas − unidades liberadas','Son unidades aún no disponibles para preparación; no se consideran necesariamente rechazadas.')
 ],
 inventory:[
 entry('Disponibilidad para preparación',pct(r.available,r.demand),'Unidades disponibles para picking / demanda real × 100','La disponibilidad operativa no es exactitud de inventario físico.'),
 entry('Stock no habilitado en base',Math.max(0,releaseBase-r.usableBase).toLocaleString('es-CL')+' unid.','Stock inicial + unidades liberadas − base utilizable','Representa unidades no habilitadas según el supuesto de confiabilidad, antes de reservas. No es merma.'),
 entry('Reserva habilitada',r.eligibleReserve.toLocaleString('es-CL')+' unid.','Mínimo(reserva física, unidades de reserva habilitadas)','Stock de contingencia activado; no representa compra nueva.'),
 entry('Cobertura disponible de demanda',pct(r.available,r.demand),'Unidades utilizables / demanda real × 100','Es cobertura en unidades para la jornada; no son días de inventario.'),
 entry('Excedente potencial de stock',Math.max(0,r.usableBase+r.eligibleReserve-r.demand).toLocaleString('es-CL')+' unid.','Máximo(0, stock utilizable + reserva habilitada − demanda real)','Posible inventario sin demanda de la jornada; no es inventario final contable ni obsolescencia.')
 ],
 picking:[
 entry('Productividad de picking',ratio(r.picked,s.pickingOperators),'Unidades preparadas / operarios asignados en la jornada','Productividad observada por persona-jornada, no UPH ni líneas por hora.'),
 entry('Utilización de capacidad de picking',pct(r.picked,r.pickingCapacity),'Unidades preparadas / capacidad configurada × 100','Si hay poco inventario, la capacidad puede quedar ociosa sin ser un problema del equipo.'),
 entry('Brecha por capacidad de picking',Math.max(0,r.available-r.pickingCapacity).toLocaleString('es-CL')+' unid.','Máximo(0, disponibles − capacidad de picking)','Unidades potencialmente preparables que exceden capacidad, no órdenes atrasadas.'),
 entry('Preparación vs. demanda real',pct(r.picked,r.demand),'Unidades preparadas / demanda real × 100','Permite leer el aporte de picking al nivel de servicio.')
 ],
 transport:[
 entry('Cumplimiento expedible',pct(r.dispatched,r.demand),'Unidades listas para expedición / demanda real × 100','Nivel de servicio simulado hasta expedición. No mide entrega final ni OTIF.'),
 entry('Utilización de capacidad de expedición',pct(r.dispatched,r.stages[7].capacity),'Unidades expedibles / capacidad de expedición configurada × 100','Baja utilización puede ser efecto de restricciones anteriores, no de mala gestión del transporte.'),
 entry('Pendiente de expedición',Math.max(0,r.demand-r.dispatched).toLocaleString('es-CL')+' unid.','Demanda real − unidades expedibles','Demanda sin cubrir al corte; no equivale a entregas atrasadas confirmadas.'),
 entry('Preparado pendiente de salida',Math.max(0,r.picked-r.dispatched).toLocaleString('es-CL')+' unid.','Unidades preparadas − unidades expedibles','Detecta acumulación previa a transporte. No permite calcular tiempos de entrega.')
 ]
 };
}
