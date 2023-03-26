package endpoints

import (
	"github.com/pkg/errors"
	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/dataservices"
	"github.com/portainer/portainer/api/internal/set"
)

// updateEnvironmentTags updates the tags associated to an environment
func updateEnvironmentTags(tx dataservices.DataStoreTx, newTags []portainer.TagID, oldTags []portainer.TagID, environmentID portainer.EndpointID) (bool, error) {
	payloadTagSet := set.ToSet(newTags)
	environmentTagSet := set.ToSet(oldTags)
	union := set.Union(payloadTagSet, environmentTagSet)
	intersection := set.Intersection(payloadTagSet, environmentTagSet)

	if len(union) <= len(intersection) {
		return false, nil
	}

	removeTags := environmentTagSet.Difference(payloadTagSet)

	update := func(tagID portainer.TagID, update func(*portainer.Tag)) error {
		tag, err := tx.Tag().Tag(tagID)
		if err != nil {
			return errors.WithMessage(err, "Unable to find a tag inside the database")
		}

		update(tag)

		return tx.Tag().UpdateTag(tagID, tag)
	}

	for tagID := range removeTags {
		err := update(tagID, func(tag *portainer.Tag) {
			delete(tag.Endpoints, environmentID)
		})

		if err != nil {
			return false, errors.WithMessage(err, "Unable to persist tag changes inside the database")
		}
	}

	addTags := payloadTagSet.Difference(environmentTagSet)
	for tagID := range addTags {
		err := update(tagID, func(tag *portainer.Tag) {
			tag.Endpoints[environmentID] = true
		})

		if err != nil {
			return false, errors.WithMessage(err, "Unable to persist tag changes inside the database")
		}
	}

	return true, nil
}
