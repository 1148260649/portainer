package endpoints

import (
	"github.com/pkg/errors"
	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/internal/set"
)

// updateEnvironmentTags updates the tags associated to an environment
func (handler *Handler) updateEnvironmentTags(newTags []portainer.TagID, oldTags []portainer.TagID, environmentID portainer.EndpointID) (bool, error) {
	payloadTagSet := set.ToSet(newTags)
	environmentTagSet := set.ToSet(oldTags)
	union := set.Union(payloadTagSet, environmentTagSet)
	intersection := set.Intersection(payloadTagSet, environmentTagSet)

	if len(union) <= len(intersection) {
		return false, nil
	}

	removeTags := set.Difference(environmentTagSet, payloadTagSet)

	for tagID := range removeTags {
		err := handler.DataStore.Tag().UpdateTagFunc(tagID, func(tag *portainer.Tag) {
			delete(tag.Endpoints, environmentID)
		})

		if handler.DataStore.IsErrObjectNotFound(err) {
			return false, errors.WithMessage(err, "Unable to find a tag inside the database")
		} else if err != nil {
			return false, errors.WithMessage(err, "Unable to persist tag changes inside the database")
		}
	}

	addTags := set.Difference(payloadTagSet, environmentTagSet)
	for tagID := range addTags {
		err := handler.DataStore.Tag().UpdateTagFunc(tagID, func(tag *portainer.Tag) {
			tag.Endpoints[environmentID] = true
		})

		if handler.DataStore.IsErrObjectNotFound(err) {
			return false, errors.WithMessage(err, "Unable to find a tag inside the database")
		} else if err != nil {
			return false, errors.WithMessage(err, "Unable to persist tag changes inside the database")
		}
	}

	return true, nil
}
