package endpoints

import (
	"github.com/pkg/errors"
	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/dataservices"
	"github.com/portainer/portainer/api/internal/set"
	"github.com/portainer/portainer/api/internal/slices"
)

func updateEnvironmentEdgeGroups(tx dataservices.DataStoreTx, newEdgeGroups []portainer.EdgeGroupID, environmentID portainer.EndpointID) (bool, error) {
	edgeGroups, err := tx.EdgeGroup().EdgeGroups()
	if err != nil {
		return false, errors.WithMessage(err, "Unable to retrieve edge groups from the database")
	}

	newEdgeGroupsSet := set.ToSet(newEdgeGroups)

	environmentEdgeGroupsSet := set.Set[portainer.EdgeGroupID]{}
	for _, edgeGroup := range edgeGroups {
		for _, eID := range edgeGroup.Endpoints {
			if eID == environmentID {
				environmentEdgeGroupsSet[edgeGroup.ID] = true
			}
		}
	}

	union := set.Union(newEdgeGroupsSet, environmentEdgeGroupsSet)
	intersection := set.Intersection(newEdgeGroupsSet, environmentEdgeGroupsSet)

	if len(union) <= len(intersection) {
		return false, nil
	}

	update := func(groupID portainer.EdgeGroupID, update func(*portainer.EdgeGroup)) error {
		group, err := tx.EdgeGroup().EdgeGroup(groupID)
		if err != nil {
			return errors.WithMessage(err, "Unable to find a tag inside the database")
		}

		update(group)

		return tx.EdgeGroup().UpdateEdgeGroup(groupID, group)
	}

	removeEdgeGroups := environmentEdgeGroupsSet.Difference(newEdgeGroupsSet)
	for edgeGroupID := range removeEdgeGroups {
		err := update(edgeGroupID, func(edgeGroup *portainer.EdgeGroup) {
			edgeGroup.Endpoints = slices.RemoveItem(edgeGroup.Endpoints, func(eID portainer.EndpointID) bool {
				return eID == environmentID
			})
		})

		if err != nil {
			return false, errors.WithMessage(err, "Unable to persist Edge group changes inside the database")
		}

	}

	addToEdgeGroups := newEdgeGroupsSet.Difference(environmentEdgeGroupsSet)
	for edgeGroupID := range addToEdgeGroups {
		err := update(edgeGroupID, func(edgeGroup *portainer.EdgeGroup) {
			edgeGroup.Endpoints = append(edgeGroup.Endpoints, environmentID)
		})

		if err != nil {
			return false, errors.WithMessage(err, "Unable to persist Edge group changes inside the database")
		}
	}

	return true, nil
}
