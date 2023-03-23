package endpoints

import (
	"net/http"

	httperror "github.com/portainer/libhttp/error"
	"github.com/portainer/libhttp/request"
	"github.com/portainer/libhttp/response"
	portainer "github.com/portainer/portainer/api"
)

type endpointUpdateRelationsPayload struct {
	EdgeGroups []portainer.EdgeGroupID
	Tags       []portainer.TagID
	Group      portainer.EndpointGroupID
}

func (payload *endpointUpdateRelationsPayload) Validate(r *http.Request) error {
	return nil
}

// @id EndpointUpdateRelations
// @summary Update an environment	relations data
// @description Update an environment relations data.
// @description Edge groups, tags and environment group can be updated.
// @description
// @description **Access policy**: administrator
// @tags endpoints
// @security jwt
// @accept json
// @param id path int true "Environment identifier"
// @param body body endpointUpdateRelationsPayload true "Environment relations data"
// @success 204 "Success"
// @failure 400 "Invalid request"
// @failure 401 "Unauthorized"
// @failure 404 "Not found"
// @failure 500 "Server error"
// @router /endpoints/{id}/relations [put]
func (handler *Handler) updateRelations(w http.ResponseWriter, r *http.Request) *httperror.HandlerError {
	endpointID, err := request.RetrieveNumericRouteVariableValue(r, "id")
	if err != nil {
		return httperror.BadRequest("Invalid environment identifier route variable", err)
	}

	endpoint, err := handler.DataStore.Endpoint().Endpoint(portainer.EndpointID(endpointID))
	if handler.DataStore.IsErrObjectNotFound(err) {
		return httperror.NotFound("Unable to find an environment with the specified identifier inside the database", err)
	} else if err != nil {
		return httperror.InternalServerError("Unable to find an environment with the specified identifier inside the database", err)
	}

	payload, err := request.GetPayload[endpointUpdateRelationsPayload](r)
	if err != nil {
		return httperror.BadRequest("Invalid request payload", err)
	}

	updateRelations := false

	if payload.Group != 0 {
		groupIDChanged := endpoint.GroupID != payload.Group
		endpoint.GroupID = payload.Group
		updateRelations = updateRelations || groupIDChanged
	}

	if payload.Tags != nil {
		tagsChanged, err := handler.updateEnvironmentTags(payload.Tags, endpoint.TagIDs, endpoint.ID)
		if err != nil {
			return httperror.InternalServerError("Unable to update environment tags", err)
		}

		endpoint.TagIDs = payload.Tags
		updateRelations = updateRelations || tagsChanged
	}

	if payload.EdgeGroups != nil {
		edgeGroupsChanged, err := handler.updateEnvironmentEdgeGroups(payload.EdgeGroups, endpoint.ID)
		if err != nil {
			return httperror.InternalServerError("Unable to update environment edge groups", err)
		}

		updateRelations = updateRelations || edgeGroupsChanged
	}

	if updateRelations {
		err := handler.DataStore.Endpoint().UpdateEndpoint(endpoint.ID, endpoint)
		if err != nil {
			return httperror.InternalServerError("Unable to update environment", err)
		}

		err = handler.updateEdgeRelations(endpoint)
		if err != nil {
			return httperror.InternalServerError("Unable to update environment relations", err)
		}
	}

	return response.Empty(w)
}
