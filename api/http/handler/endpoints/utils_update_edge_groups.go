package endpoints

import (
	"github.com/pkg/errors"
	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/internal/set"
	"github.com/portainer/portainer/api/internal/slices"
)

func (handler *Handler) updateEnvironmentEdgeGroups(newEdgeGroups []portainer.EdgeGroupID, environmentID portainer.EndpointID) (bool, error) {
	edgeGroups, err := handler.DataStore.EdgeGroup().EdgeGroups()
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

	removeEdgeGroups := set.Difference(environmentEdgeGroupsSet, newEdgeGroupsSet)
	for edgeGroupID := range removeEdgeGroups {
		err := handler.DataStore.EdgeGroup().UpdateEdgeGroupFunc(edgeGroupID, func(edgeGroup *portainer.EdgeGroup) {
			edgeGroup.Endpoints = slices.RemoveItem(edgeGroup.Endpoints, func(eID portainer.EndpointID) bool {
				return eID == environmentID
			})
		})

		if handler.DataStore.IsErrObjectNotFound(err) {
			return false, errors.WithMessage(err, "Unable to find environment group inside the database")
		}

		if err != nil {
			return false, errors.WithMessage(err, "Unable to update environment group inside the database")
		}
	}

	addToEdgeGroups := set.Difference(newEdgeGroupsSet, environmentEdgeGroupsSet)
	for edgeGroupID := range addToEdgeGroups {
		err := handler.DataStore.EdgeGroup().UpdateEdgeGroupFunc(edgeGroupID, func(edgeGroup *portainer.EdgeGroup) {
			edgeGroup.Endpoints = append(edgeGroup.Endpoints, environmentID)
		})

		if handler.DataStore.IsErrObjectNotFound(err) {
			return false, errors.WithMessage(err, "Unable to find environment group inside the database")
		}

		if err != nil {
			return false, errors.WithMessage(err, "Unable to update environment group inside the database")
		}
	}

	return true, nil
}
