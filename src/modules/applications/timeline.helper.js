/**
 * Builds a STATUS_CHANGED timeline entry for an application.
 * @param {string} actorId - User ID of the actor making the change
 * @param {string|null} from - Previous stage key
 * @param {string} to - Next stage key
 * @returns {object} Timeline entry object
 */
export const buildStatusChangedTimelineEntry = (actorId, from, to) => {
  return {
    type: "STATUS_CHANGED",
    actorId,
    metadata: {
      from,
      to,
    },
    createdAt: new Date(),
  };
};
