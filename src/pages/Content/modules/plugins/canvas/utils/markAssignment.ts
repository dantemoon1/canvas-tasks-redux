import { FinalAssignment } from '../../../types';
import { AssignmentStatus, AssignmentType } from '../../../types/assignment';
import apiReq from '../../../utils/apiReq';

/* Mark an assignment either complete or incomplete via planner overrides.*/
function deleteAssignmentCanvas(assignment: FinalAssignment): void {
  const json = JSON.stringify({
    id: assignment.plannable_id,
  });
  apiReq('/v1/planner_notes/' + assignment.plannable_id, json, 'delete');
}

/* Mark an assignment either complete or incomplete via planner overrides.*/
export default function markAssignmentCanvas(
  complete: AssignmentStatus,
  assignment: FinalAssignment
): FinalAssignment {
  const retAssignment = { ...assignment };
  const method = assignment.override_id ? 'put' : 'post';
  if (complete === AssignmentStatus.DELETED) deleteAssignmentCanvas(assignment);
  else if (complete === AssignmentStatus.SEEN) {
    apiReq(
      `/v1/courses/${assignment.course_id}/discussion_topics/${assignment.id}`,
      '',
      'put',
      'read'
    );
    retAssignment.marked_complete = true;
  } else {
    const json = JSON.stringify({
      plannable_type: assignment.type.toString(),
      plannable_id: assignment.plannable_id,
      marked_complete: complete === AssignmentStatus.COMPLETE,
    });
    apiReq('/v1/planner/overrides', json, method, assignment.override_id + '');
    retAssignment.marked_complete = complete === AssignmentStatus.COMPLETE;
    if (complete === AssignmentStatus.UNFINISHED && !assignment.override_id)
      retAssignment.override_id = '0';
  }
  return retAssignment;
}
