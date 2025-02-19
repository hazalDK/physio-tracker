import json
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpRequest, HttpResponseForbidden, JsonResponse, HttpResponseBadRequest, HttpResponseNotFound
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import Group
from django.views.generic import CreateView
from django.views.decorators.csrf import csrf_exempt


from .models import User, UserExercise, Exercise, ExerciseCategory, Report

class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ('first_name', 'last_name', 'date_of_birth','email',)
        help_texts = {
            'username': ''
        }
    #add styling
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, field in self.fields.items():
            field.widget.attrs['class'] = 'form-control'

def main_spa(request: HttpRequest) -> HttpResponse:
    return render(request, 'main.html', {})

class sign_up_page(CreateView):
    form_class = CustomUserCreationForm
    #success_url = reverse_lazy("login")
    template_name = "registration/signup.html"

    def form_valid(self, form):
        user = form.save()
        group = Group.objects.get(name='Client')
        user.groups.add(group)
        return redirect('login')


def authCheck(request):
    if (request.method == "GET"):
        auth = True
        user = None
        if not request.user.is_authenticated:
            auth = False
        else:
            user = request.user.as_dict()
        return JsonResponse({
            "auth": auth,
            "user": user
        })
    return HttpResponseForbidden("AuthCheck is only done via GET")

@csrf_exempt
def axios_endpoints(request, model_type: str, pk_id=-1):
    '''
    Main endpoint for all api queries
    
    Uses a switch case depending on the value of request.method   
    passes a pk_id if it is a axios delete or axios put query
    If there is a pk_id and the method = POST a 400 will be returned
    '''
    # if not request.user.is_authenticated: #COMMENT WHEN USING POSTMAN
    #     return HttpResponseForbidden("Anonymous Users cannot access API")
    match (request.method):
        case "GET":
            return getData(request, model_type, pk_id)
        case "POST":
            if (pk_id != -1):
                return HttpResponseBadRequest("POST request require no id")
            return postData(request,model_type)
        case "DELETE":
            return deleteData(request, model_type, pk_id)
        case "PUT":
            return putData(request, model_type, pk_id)


def getData(request, model_type: str, pk_id: int):
    '''
    Function ran on GET request method to fetch objects of a model type
    
    Returns data in JsonResponse
    '''
    match (model_type):
        case "user":   # can get the current user via actual id with less details or -1 with more
            if pk_id == -1:
                return JsonResponse({
                    model_type: request.user.as_dict()
                })
            returnVal = User.objects.get(pk=pk_id).priv_as_dict()
            return JsonResponse({
                model_type: returnVal
            })
        case "user exercises":
            returnVal = UserExercise.objects.all().filter(user=request.user)
            return JsonResponse({
                model_type: [
                    d.as_dict()
                    for d in returnVal
                ]
            })
        case "exercise":
            returnVal = Exercise.objects.all()
            return JsonResponse({
                model_type: [
                    d.as_dict()
                    for d in returnVal
                ]
            })
        case "exercise catagory":
            returnVal = ExerciseCategory.objects.all()
            return JsonResponse({
                model_type: [
                    d.as_dict()
                    for d in returnVal
                ]
            })
        case "report":
            returnVal = Report.objects.all().filter(user=request.user)
            return JsonResponse({
                model_type: [
                    d.as_dict()
                    for d in returnVal
                ]
            })
    return returnVal

def postData(request, model_type: str):
    '''
    Function ran on POST request method

    Loads the request's raw body into a json and then usues the data in it to create a new object
    
    Type of model is passed down from axios_endpoints

    Exception Handling is available and 400 is sent on bad request 
    
    Returns data in JsonResponse
    '''
    body: str = json.loads(request.body)
    try:
        match (model_type):
            case "user":
                # Extract and handle exercises
                exercise_objects = []
                for exercise in body.get("exercises", []):
                    exerciseObj = get_object_or_404(Exercise, name=exercise)
                    exercise_objects.append(exerciseObj)

                # Remove exercises from the body before creating the user
                del body["exercises"]

                # Create the User object
                item = User.objects.create(**body)

                # Set the many-to-many relationship
                item.exercises.set(exercise_objects)
                item.save()
            case "user exercises":
                if (body["user"].isnumeric()):
                    userObj = get_object_or_404(User, pk=body["user"])
                else:
                    userObj = get_object_or_404(User, name=body["user"])
                if (body["exercise"].isnumeric()):
                    exerciseObj = get_object_or_404(User, pk=body["exercise"])
                else:
                    exerciseObj = get_object_or_404(User, name=body["exercise"])
                del body["user"]
                del body["exercise"]
                item = UserExercise.objects.create(user=userObj, exercise=exerciseObj, **body)
            case "report":
                if (body["user"].isnumeric()):
                    userObj = get_object_or_404(User, pk=body["user"])
                else:
                    userObj = get_object_or_404(User, name=body["user"])
                del body["user"]
                item = Report.objects.create(user=userObj, **body)
            case "exercise":
                item = Exercise.objects.create(**body)
            case "exercise catagory":
                item = ExerciseCategory.objects.create(**body)
    except Exception as e:
        print(e)
        return HttpResponseBadRequest(f"Incorrect POST body format for {model_type}. Exception: {e}")
    return JsonResponse({"message": f"{model_type} id: {item.id} was added successfully"})

def putData(request, model_type: str, pk_id: int):
    '''
    Function ran on PUT request method

    Uses the param pk_id and the json loaded raw request body to find the affected object and update it accordingly

    When updating User it updates the attributes if the key is not equal to Hobby, It then updates hobbies by 
    finding whats in the hobbies key and sets it as the new value for hobbies key

    User's Body and the Friend User's items cannot be updated once created, hence they are popped

    Exception Handling is available and 400 is sent on bad request

    Returns data in JsonResponse
    '''
    body: str = json.loads(request.body)
    try:
        body.pop('id', None)
        match (model_type):
            case "user":
                #PUT for user should only be for the current client
                item = request.user

                # set attributes for any value that is not exercise
                for key, value in body.items():
                    if key != "exercise":
                        setattr(item, key, value)
                
                if "exercises" in body:
                    exercise_objects = []
                    for exercise in body.get("exercises", []):
                        if isinstance(exercise, int):
                            exerciseObj = get_object_or_404(Exercise, pk=exercise)
                        else:
                            exerciseObj = get_object_or_404(Exercise, name=exercise)
                        exercise_objects.append(exerciseObj)
                    item.exercise.set(exercise_objects)
                item.save()
            case "user Exercise":
                # do not update the models linked to the through model
                body.pop('user', None)
                UserExercise.objects.filter(pk=pk_id).update(**body)
            case "report":
                # do not update the models linked to the through model
                body.pop('user', None)
                Report.objects.filter(pk=pk_id).update(**body)
            case "exercise catagory":
                ExerciseCategory.objects.filter(pk=pk_id).update(**body)
            case "exercise":
                body.pop('exercise', None)
                Exercise.objects.filter(pk=pk_id).update(**body)
    except Exception as e:
        print(e)
        return HttpResponseBadRequest(f"Incorrect raw json body format for {model_type}. Exception: {e}")
    return JsonResponse({"message": f"{model_type} id: {pk_id} was updated successfully"})

def deleteData(request, model_type: str, pk_id: int):
    '''
    Function ran on DELETE request method

    Uses the param pk_id to find the affected object and delete it

    Exception Handling is available and 404 is sent on bad request
    
    Returns data in JsonResponse
    '''
    try:
        match (model_type):
            case "user":
                if (pk_id != 0):
                    return HttpResponseBadRequest(f"Wrong request method used, user cannot delete other users")
                pk_id = request.user.id #set correct id for message
                request.user.delete()
            case "user exercises":
                UserExercise.objects.get(pk=pk_id).delete()
            case "exercise":
                Exercise.objects.get(pk=pk_id).delete()
            case "exercise catagory":
                ExerciseCategory.objects.get(pk=pk_id).delete()
            case "report":
                Report.objects.get(pk=pk_id).delete()
    except Exception as e:
        print(e)
        return HttpResponseNotFound(f"Id {pk_id} not found for {model_type}. Exception: {e}")
    return JsonResponse({"message": f"{model_type} id: {pk_id} was deleted successfully"})